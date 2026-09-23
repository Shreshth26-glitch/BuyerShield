import { PrecedentModel } from '../models/precedentModel.js';
import { LLMService } from '../services/llmService.js';
import { EmbeddingService } from '../services/embeddingService.js';

export const AdminPrecedentController = {
  /**
   * LLM Extraction step: extracts proposed structured fields from raw tribunal order text.
   * POST /api/admin/precedents/extract
   */
  async extractPrecedent(req, res) {
    try {
      const { rawText } = req.body;
      if (!rawText || !rawText.trim()) {
        return res.status(400).json({
          success: false,
          error: 'rawText is required for precedent extraction.',
        });
      }

      const extracted = await LLMService.extractPrecedentFromText(rawText);
      return res.status(200).json({
        success: true,
        data: extracted,
      });
    } catch (err) {
      console.error('Admin precedent extraction failed:', err);
      return res.status(500).json({
        success: false,
        error: err.message || 'Failed to extract precedent fields.',
      });
    }
  },

  /**
   * Lists precedents with filtering and search.
   * GET /api/admin/precedents
   */
  async listPrecedents(req, res) {
    try {
      const { search, state, remedyType, unembedded } = req.query;
      const precedents = await PrecedentModel.list({
        search,
        state,
        remedyType,
        unembeddedOnly: unembedded === 'true',
        limit: 100,
      });
      const total = await PrecedentModel.count();

      return res.status(200).json({
        success: true,
        data: precedents,
        total,
      });
    } catch (err) {
      console.error('Admin list precedents error:', err);
      return res.status(500).json({
        success: false,
        error: 'Failed to retrieve precedents.',
      });
    }
  },

  /**
   * Creates and embeds a confirmed precedent order.
   * POST /api/admin/precedents
   */
  async createPrecedent(req, res) {
    try {
      const {
        state,
        orderDate,
        summary,
        outcomeType,
        awardedAmount,
        interestRate,
        sourceUrl,
        delayMonths,
        amountPaidPercentage,
        remedyType,
      } = req.body;

      if (!state || !summary || !outcomeType) {
        return res.status(400).json({
          success: false,
          error: 'State, summary, and outcomeType are required.',
        });
      }

      // Generate embedding
      const embeddingText = `${state} ${remedyType || ''} delay ${delayMonths || ''} months paid ${amountPaidPercentage || ''}%: ${summary}`;
      const embedding = await EmbeddingService.getEmbedding(embeddingText);

      const created = await PrecedentModel.create({
        state,
        orderDate,
        summary,
        outcomeType,
        awardedAmount,
        interestRate,
        sourceUrl,
        delayMonths,
        amountPaidPercentage,
        remedyType,
        isUsable: true,
        embedding,
      });

      return res.status(201).json({
        success: true,
        data: created,
      });
    } catch (err) {
      console.error('Admin create precedent error:', err);
      return res.status(500).json({
        success: false,
        error: err.message || 'Failed to create precedent.',
      });
    }
  },

  /**
   * Updates an existing precedent order and recomputes embedding if needed.
   * PUT /api/admin/precedents/:id
   */
  async updatePrecedent(req, res) {
    try {
      const id = parseInt(req.params.id, 10);
      const updates = req.body;

      // Recompute embedding if summary, state, or delay changed
      if (updates.summary || updates.state || updates.delayMonths) {
        const existing = await PrecedentModel.getById(id);
        if (existing) {
          const state = updates.state || existing.state;
          const remedyType = updates.remedyType || existing.remedy_type;
          const delayMonths = updates.delayMonths !== undefined ? updates.delayMonths : existing.delay_months;
          const amountPaidPercentage =
            updates.amountPaidPercentage !== undefined ? updates.amountPaidPercentage : existing.amount_paid_percentage;
          const summary = updates.summary || existing.summary;

          const embeddingText = `${state} ${remedyType || ''} delay ${delayMonths || ''} months paid ${amountPaidPercentage || ''}%: ${summary}`;
          updates.embedding = await EmbeddingService.getEmbedding(embeddingText);
        }
      }

      const updated = await PrecedentModel.update(id, updates);
      if (!updated) {
        return res.status(404).json({
          success: false,
          error: 'Precedent not found.',
        });
      }

      return res.status(200).json({
        success: true,
        data: updated,
      });
    } catch (err) {
      console.error('Admin update precedent error:', err);
      return res.status(500).json({
        success: false,
        error: err.message || 'Failed to update precedent.',
      });
    }
  },

  /**
   * Deletes a precedent order.
   * DELETE /api/admin/precedents/:id
   */
  async deletePrecedent(req, res) {
    try {
      const id = parseInt(req.params.id, 10);
      const deleted = await PrecedentModel.delete(id);
      if (!deleted) {
        return res.status(404).json({
          success: false,
          error: 'Precedent not found.',
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Precedent successfully deleted.',
      });
    } catch (err) {
      console.error('Admin delete precedent error:', err);
      return res.status(500).json({
        success: false,
        error: 'Failed to delete precedent.',
      });
    }
  },
};
