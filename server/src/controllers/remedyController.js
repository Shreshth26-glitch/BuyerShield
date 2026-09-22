import { CaseModel } from '../models/caseModel.js';
import { RemedyPolicyModel } from '../models/remedyPolicyModel.js';
import { RemedyCalculationModel } from '../models/remedyCalculationModel.js';
import {
  calculateWithdrawRemedy,
  calculateContinueRemedy,
  normalizeDate,
  formatDateOnly,
} from '../utils/remedyMath.js';

export const RemedyController = {
  /**
   * POST /api/cases/:id/calculate-remedy
   * Runs pure Section 18 calculations, records to audit trail, and returns comparative breakdown.
   */
  async calculateRemedy(req, res, next) {
    try {
      const caseId = parseInt(req.params.id, 10);
      if (isNaN(caseId)) {
        return res.status(400).json({ success: false, error: 'Invalid case identifier.' });
      }

      // Check case ownership and retrieve details with payment sums
      const caseData = await CaseModel.findById(caseId, req.user.id);
      if (!caseData) {
        return res.status(404).json({ success: false, error: 'Case dossier not found.' });
      }

      // Determine Principal Amount (from payments ledger sum, fallback to amount_paid)
      const principal = parseFloat(caseData.total_paid || caseData.amount_paid || 0);
      if (principal <= 0) {
        return res.status(400).json({
          success: false,
          code: 'ZERO_PRINCIPAL',
          error: 'No payment disbursements found on ledger. Please log at least one installment before calculating remedies.',
        });
      }

      // Determine contractual possession deadline
      const baselineDateStr = caseData.promised_date_from_agreement || caseData.registered_possession_date;
      if (!baselineDateStr) {
        return res.status(400).json({
          success: false,
          code: 'MISSING_POSSESSION_DATE',
          error: 'Neither a contractual agreement date nor a registered possession date is recorded for this case.',
        });
      }

      const baselineDate = normalizeDate(baselineDateStr);
      // Delay begins the day immediately following the promised handover deadline
      const delayStartDate = new Date(baselineDate.getTime() + 1000 * 60 * 60 * 24);
      const today = normalizeDate(new Date());

      // Guardrail: Refuse calculation if project is not delayed
      if (today.getTime() <= baselineDate.getTime()) {
        return res.status(400).json({
          success: false,
          code: 'NOT_YET_DELAYED',
          error: `Project handover deadline (${formatDateOnly(baselineDate)}) has not yet passed. Statutory Section 18 remedies activate only after breach of the contractual handover date.`,
          data: {
            isDelayed: false,
            promisedDate: formatDateOnly(baselineDate),
            today: formatDateOnly(today),
          },
        });
      }

      // Fetch state interest rate policy
      let policy;
      try {
        policy = await RemedyPolicyModel.getApplicableRate(caseData.state, today);
      } catch (err) {
        if (err.name === 'PolicyNotFoundError') {
          return res.status(400).json({
            success: false,
            code: err.code,
            error: err.message,
          });
        }
        throw err;
      }

      const applicableRate = policy.totalRate;

      // Execute pure deterministic math
      const withdrawResult = calculateWithdrawRemedy({
        principalAmount: principal,
        delayStartDate,
        today,
        rate: applicableRate,
      });

      const continueResult = calculateContinueRemedy({
        principalAmount: principal,
        delayStartDate,
        today,
        rate: applicableRate,
      });

      // Persist immutable audit log entries in remedy_calculations
      const { remedyType } = req.body || {};

      let savedWithdraw;
      let savedContinue;

      if (!remedyType || remedyType === 'withdraw' || remedyType === 'both') {
        savedWithdraw = await RemedyCalculationModel.recordCalculation({
          buyerCaseId: caseId,
          remedyType: 'withdraw',
          applicableRate,
          principalAmount: principal,
          delayStartDate: formatDateOnly(delayStartDate),
          delayEndDate: formatDateOnly(today),
          computedAmount: withdrawResult.totalAmount,
          breakdownJson: withdrawResult.breakdown,
        });
      }

      if (!remedyType || remedyType === 'continue' || remedyType === 'both') {
        savedContinue = await RemedyCalculationModel.recordCalculation({
          buyerCaseId: caseId,
          remedyType: 'continue',
          applicableRate,
          principalAmount: principal,
          delayStartDate: formatDateOnly(delayStartDate),
          delayEndDate: formatDateOnly(today),
          computedAmount: continueResult.totalAccruedSoFar,
          breakdownJson: continueResult.breakdown,
        });
      }

      return res.status(200).json({
        success: true,
        data: {
          isDelayed: true,
          caseId,
          principalAmount: principal,
          delayStartDate: formatDateOnly(delayStartDate),
          delayEndDate: formatDateOnly(today),
          policy: {
            state: policy.state,
            benchmarkName: policy.benchmarkName,
            benchmarkRateSource: policy.benchmarkRateSource,
            benchmarkRateValue: policy.benchmarkRateValue,
            addedPercentage: policy.addedPercentage,
            totalRate: policy.totalRate,
            effectiveFrom: policy.effectiveFrom,
            sourceUrl: policy.sourceUrl,
          },
          withdraw: {
            ...withdrawResult,
            calculationId: savedWithdraw?.id,
          },
          continue: {
            ...continueResult,
            calculationId: savedContinue?.id,
          },
        },
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/cases/:id/remedy-history
   * Retrieves past calculation audit history for a case.
   */
  async getRemedyHistory(req, res, next) {
    try {
      const caseId = parseInt(req.params.id, 10);
      if (isNaN(caseId)) {
        return res.status(400).json({ success: false, error: 'Invalid case identifier.' });
      }

      const caseData = await CaseModel.findById(caseId, req.user.id);
      if (!caseData) {
        return res.status(404).json({ success: false, error: 'Case dossier not found.' });
      }

      const history = await RemedyCalculationModel.getHistoryByCaseId(caseId);

      return res.status(200).json({
        success: true,
        data: history,
      });
    } catch (err) {
      next(err);
    }
  },
};
