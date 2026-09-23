import { CaseModel } from '../models/caseModel.js';
import { ExplanationModel } from '../models/explanationModel.js';
import { RetrievalService } from '../services/retrievalService.js';

export const ExplanationController = {
  /**
   * Generates a RAG-grounded legal explanation for a buyer case remedy.
   * POST /api/cases/:id/explain-remedy
   */
  async explainRemedy(req, res) {
    try {
      const caseId = parseInt(req.params.id, 10);
      const userId = req.user.id;

      // Verify case exists and belongs to requesting user (strict isolation -> 404)
      const existingCase = await CaseModel.getCaseById(caseId);
      if (!existingCase || existingCase.user_id !== userId) {
        return res.status(404).json({
          success: false,
          error: 'Case not found or access restricted.',
        });
      }

      const { remedyCalculationId, remedyType = 'withdraw', queryText } = req.body;

      const result = await RetrievalService.explainRemedy({
        buyerCaseId: caseId,
        remedyCalculationId: remedyCalculationId ? parseInt(remedyCalculationId, 10) : null,
        remedyType,
        queryText,
      });

      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      console.error('Explanation controller error:', err);
      const status = err.status || 500;
      return res.status(status).json({
        success: false,
        error: err.message || 'Failed to generate legal explanation.',
      });
    }
  },

  /**
   * Retrieves past explanation audit trail for a case.
   * GET /api/cases/:id/explanations
   */
  async getExplanationHistory(req, res) {
    try {
      const caseId = parseInt(req.params.id, 10);
      const userId = req.user.id;

      // Verify case exists and belongs to requesting user
      const existingCase = await CaseModel.getCaseById(caseId);
      if (!existingCase || existingCase.user_id !== userId) {
        return res.status(404).json({
          success: false,
          error: 'Case not found or access restricted.',
        });
      }

      const history = await ExplanationModel.getHistoryByCaseId(caseId);

      return res.status(200).json({
        success: true,
        data: history,
      });
    } catch (err) {
      console.error('Failed to get explanation history:', err);
      return res.status(500).json({
        success: false,
        error: 'Failed to retrieve explanation history.',
      });
    }
  },
};
