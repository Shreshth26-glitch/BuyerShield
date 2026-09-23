import { CaseModel } from '../models/caseModel.js';
import { ProvisionModel } from '../models/provisionModel.js';
import { PrecedentModel } from '../models/precedentModel.js';
import { ExplanationModel } from '../models/explanationModel.js';
import { RemedyCalculationModel } from '../models/remedyCalculationModel.js';
import { RemedyPolicyModel } from '../models/remedyPolicyModel.js';
import { EmbeddingService } from './embeddingService.js';
import { LLMService } from './llmService.js';

export class RetrievalService {
  /**
   * Explains statutory remedy and precedent grounding for a buyer case.
   */
  static async explainRemedy({ buyerCaseId, remedyCalculationId = null, remedyType = 'withdraw', queryText = null }) {
    // 1. Fetch case details and verify existence
    const caseData = await CaseModel.getCaseById(buyerCaseId);
    if (!caseData) {
      const err = new Error('Case not found');
      err.status = 404;
      throw err;
    }

    // Determine delay duration in months
    const daysDelayed = caseData.days_delayed || 0;
    const delayMonths = Math.max(1, Math.round(daysDelayed / 30.4375));

    // Determine payment details
    const totalPaid = parseFloat(caseData.total_paid || caseData.amount_paid || 0);
    // Estimated payment percentage (defaulting to 85% if agreement total not recorded)
    const amountPaidPercentage = 85.0;

    // Get current policy rate for state
    let interestRate = 11.1;
    try {
      const policy = await RemedyPolicyModel.getEffectivePolicy(caseData.state, new Date());
      if (policy) {
        interestRate = policy.total_rate;
      }
    } catch {
      // Fallback default
    }

    const buyerFacts = {
      buyerCaseId,
      state: caseData.state,
      projectName: caseData.project_name,
      delayMonths,
      amountPaid: totalPaid,
      amountPaidPercentage,
      remedyType: remedyType.toLowerCase(),
      interestRate,
    };

    // 2. Build structured query representation
    const structuredQuery = `${buyerFacts.state} Section 18 ${buyerFacts.remedyType} delay of ${buyerFacts.delayMonths} months paid ${buyerFacts.amountPaidPercentage}%`;
    const queryEmbedding = await EmbeddingService.getEmbedding(queryText ? `${queryText} ${structuredQuery}` : structuredQuery);

    // 3. Retrieve relevant act_provisions (Section 18 core + state rule)
    const stateRuleSection = buyerFacts.state === 'Maharashtra' ? 'MahaRERA Rule 18' : 'Karnataka RERA Rule 16';
    const coreSectionNumbers = [
      buyerFacts.remedyType === 'withdraw' ? 'Section 18(1)' : 'Section 18(1) Proviso',
      'Section 2(za)',
      'Section 19(4)',
      'Section 31',
      stateRuleSection,
    ];

    let retrievedProvisions = await ProvisionModel.getBySectionNumbers(coreSectionNumbers);
    if (retrievedProvisions.length === 0) {
      retrievedProvisions = await ProvisionModel.findRelevant({
        queryEmbedding,
        state: buyerFacts.state,
        limit: 4,
      });
    }

    // 4. Retrieve candidate precedent_orders (top ~15 by vector similarity)
    const candidates = await PrecedentModel.findCandidates({
      queryEmbedding,
      remedyType: buyerFacts.remedyType,
      state: buyerFacts.state,
      limit: 15,
    });

    // 5. RERANK candidates by matching STRUCTURED facts
    const rerankedPrecedents = this.rerankCandidates(candidates, buyerFacts);

    // 6. Relevance Threshold & Confidence Flag
    // A precedent qualifies as a genuinely close comparable precedent if:
    // 1. Its combined score meets the relevance threshold (>= 0.52)
    // 2. AND it either shares the state jurisdiction OR has a close delay timeline (delay_score >= 0.60)
    const qualifyingPrecedents = rerankedPrecedents.filter(
      (p) => p.combined_score >= 0.52 && (p.state_score > 0 || p.delay_score >= 0.60)
    );
    const confidenceFlag = qualifyingPrecedents.length >= 2 ? 'grounded' : 'low_confidence';

    const selectedPrecedents = (qualifyingPrecedents.length > 0 ? qualifyingPrecedents : rerankedPrecedents).slice(0, 4);

    // 7. Generate explanation via LLM Service
    const explanationText = await LLMService.generateExplanation({
      buyerFacts,
      provisions: retrievedProvisions,
      precedents: selectedPrecedents,
      confidenceFlag,
    });

    // 8. Extract citations and structured summary
    const citedProvisions = retrievedProvisions.map((p) => ({
      id: p.id,
      sectionNumber: p.section_number,
      title: p.title,
      fullText: p.full_text,
      state: p.state,
    }));

    const citedPrecedents = selectedPrecedents.map((pr) => ({
      id: pr.id,
      state: pr.state,
      orderDate: pr.order_date,
      outcomeType: pr.outcome_type,
      remedyType: pr.remedy_type,
      delayMonths: pr.delay_months,
      amountPaidPercentage: pr.amount_paid_percentage,
      awardedAmount: pr.awarded_amount,
      interestRate: pr.interest_rate,
      sourceUrl: pr.source_url,
      summary: pr.summary,
      similarityScore: pr.combined_score,
      relevanceNote: this.generateRelevanceNote(pr, buyerFacts),
    }));

    // 9. Persist explanation request into audit log
    const recorded = await ExplanationModel.recordExplanation({
      buyerCaseId,
      remedyCalculationId,
      remedyType: buyerFacts.remedyType,
      queryText: queryText || structuredQuery,
      retrievedProvisionIds: retrievedProvisions.map((p) => p.id),
      retrievedPrecedentIds: selectedPrecedents.map((pr) => pr.id),
      generatedExplanation: explanationText,
      confidenceFlag,
      rawResponseJson: {
        citedProvisions,
        citedPrecedents,
      },
    });

    return {
      requestId: recorded.id,
      explanationText,
      citedProvisions,
      citedPrecedents,
      confidenceFlag,
      createdAt: recorded.created_at,
    };
  }

  /**
   * Reranks candidate precedents using structured facts.
   * Balances semantic similarity (40%) with structured legal facts (60%):
   * - Delay duration proximity: 25%
   * - Payment percentage proximity: 15%
   * - State match: 10%
   * - Remedy type match: 10%
   */
  static rerankCandidates(candidates = [], buyerFacts) {
    if (!candidates || candidates.length === 0) return [];

    return candidates
      .map((candidate) => {
        const rawSim = candidate.vector_similarity !== undefined ? candidate.vector_similarity : 0.5;

        // 1. Delay duration proximity (0 to 1)
        let delayScore = 0.5;
        if (candidate.delay_months !== null && buyerFacts.delayMonths) {
          const delayDiff = Math.abs(candidate.delay_months - buyerFacts.delayMonths);
          delayScore = Math.max(0, 1 - delayDiff / Math.max(buyerFacts.delayMonths, 24));
        }

        // 2. Amount paid percentage proximity (0 to 1)
        let paymentScore = 0.5;
        if (candidate.amount_paid_percentage !== null && buyerFacts.amountPaidPercentage) {
          const paidDiff = Math.abs(candidate.amount_paid_percentage - buyerFacts.amountPaidPercentage);
          paymentScore = Math.max(0, 1 - paidDiff / 50);
        }

        // 3. State jurisdiction match (0 or 1)
        const stateScore = candidate.state && buyerFacts.state && candidate.state.toLowerCase() === buyerFacts.state.toLowerCase() ? 1.0 : 0.0;

        // 4. Remedy type match (0 or 1)
        const remedyScore =
          candidate.remedy_type && buyerFacts.remedyType && candidate.remedy_type.toLowerCase() === buyerFacts.remedyType.toLowerCase() ? 1.0 : 0.0;

        // Weighted combined score
        const combinedScore =
          rawSim * 0.40 +
          delayScore * 0.25 +
          paymentScore * 0.15 +
          stateScore * 0.10 +
          remedyScore * 0.10;

        return {
          ...candidate,
          delay_score: Number(delayScore.toFixed(3)),
          payment_score: Number(paymentScore.toFixed(3)),
          state_score: stateScore,
          remedy_score: remedyScore,
          combined_score: Number(combinedScore.toFixed(3)),
        };
      })
      .sort((a, b) => b.combined_score - a.combined_score);
  }

  static generateRelevanceNote(precedent, buyerFacts) {
    const delayDiff = Math.abs((precedent.delay_months || 0) - (buyerFacts.delayMonths || 0));
    const isSameState = precedent.state === buyerFacts.state;
    const sameRemedy = precedent.remedy_type === buyerFacts.remedyType;

    const parts = [];
    if (isSameState) parts.push(`Adjudicated by ${precedent.state} RERA`);
    if (delayDiff <= 6) parts.push(`closely matching delay (${precedent.delay_months}m vs ${buyerFacts.delayMonths}m)`);
    if (sameRemedy) parts.push(`addressed ${precedent.remedy_type} remedy under Section 18`);

    return parts.length > 0 ? parts.join(', ') : 'Comparable delay timeline under Section 18';
  }
}
