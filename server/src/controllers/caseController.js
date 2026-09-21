import { CaseModel } from '../models/caseModel.js';
import { ProjectModel } from '../models/projectModel.js';
import { PaymentModel } from '../models/paymentModel.js';

const isValidDate = (dateStr) => {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return false;
  const tenYearsFromNow = new Date();
  tenYearsFromNow.setFullYear(tenYearsFromNow.getFullYear() + 10);
  return d <= tenYearsFromNow;
};

export const CaseController = {
  // GET /api/cases
  async getMyCases(req, res, next) {
    try {
      const cases = await CaseModel.findByUserId(req.user.id);
      return res.status(200).json({
        success: true,
        data: cases,
      });
    } catch (err) {
      next(err);
    }
  },

  // GET /api/cases/:id
  async getCaseById(req, res, next) {
    try {
      const caseId = parseInt(req.params.id, 10);
      if (isNaN(caseId)) {
        return res.status(404).json({
          success: false,
          error: 'Case not found',
        });
      }

      const buyerCase = await CaseModel.findById(caseId, req.user.id);
      // Return 404 (not 403) for cases that exist but aren't the requester's
      if (!buyerCase) {
        return res.status(404).json({
          success: false,
          error: 'Case not found',
        });
      }

      // Fetch payment history
      const payments = await PaymentModel.findByCaseId(caseId);

      return res.status(200).json({
        success: true,
        data: {
          ...buyerCase,
          payments,
        },
      });
    } catch (err) {
      next(err);
    }
  },

  // POST /api/cases
  async createCase(req, res, next) {
    try {
      const {
        project_id,
        promised_date_from_agreement,
        amount_paid = 0,
        chosen_remedy = 'UNDECIDED',
      } = req.body;

      if (!project_id) {
        return res.status(400).json({
          success: false,
          error: 'project_id is required',
        });
      }

      // Verify project exists
      const project = await ProjectModel.findById(project_id);
      if (!project) {
        return res.status(400).json({
          success: false,
          error: 'Referenced project does not exist in registry',
        });
      }

      if (!promised_date_from_agreement || !isValidDate(promised_date_from_agreement)) {
        return res.status(400).json({
          success: false,
          error: 'promised_date_from_agreement is required and must be a valid date within 10 years.',
        });
      }

      const parsedAmount = parseFloat(amount_paid) || 0;
      if (parsedAmount < 0) {
        return res.status(400).json({
          success: false,
          error: 'amount_paid must be a positive number or zero.',
        });
      }

      const newCase = await CaseModel.create({
        user_id: req.user.id,
        project_id,
        promised_date_from_agreement,
        amount_paid: parsedAmount,
        chosen_remedy,
      });

      const payments = await PaymentModel.findByCaseId(newCase.id);

      return res.status(201).json({
        success: true,
        message: 'Case created successfully',
        data: {
          ...newCase,
          payments,
        },
      });
    } catch (err) {
      next(err);
    }
  },

  // PATCH /api/cases/:id
  async updateCase(req, res, next) {
    try {
      const caseId = parseInt(req.params.id, 10);
      if (isNaN(caseId)) {
        return res.status(404).json({
          success: false,
          error: 'Case not found',
        });
      }

      const existingCase = await CaseModel.findById(caseId, req.user.id);
      if (!existingCase) {
        return res.status(404).json({
          success: false,
          error: 'Case not found',
        });
      }

      const { promised_date_from_agreement, chosen_remedy } = req.body;

      if (promised_date_from_agreement !== undefined) {
        if (!isValidDate(promised_date_from_agreement)) {
          return res.status(400).json({
            success: false,
            error: 'Invalid promised_date_from_agreement. Must be a valid date within 10 years.',
          });
        }
      }

      const updatedCase = await CaseModel.update(caseId, req.user.id, {
        promised_date_from_agreement,
        chosen_remedy,
      });

      const payments = await PaymentModel.findByCaseId(caseId);

      return res.status(200).json({
        success: true,
        message: 'Case updated successfully',
        data: {
          ...updatedCase,
          payments,
        },
      });
    } catch (err) {
      next(err);
    }
  },

  // DELETE /api/cases/:id
  async deleteCase(req, res, next) {
    try {
      const caseId = parseInt(req.params.id, 10);
      if (isNaN(caseId)) {
        return res.status(404).json({
          success: false,
          error: 'Case not found',
        });
      }

      const deleted = await CaseModel.delete(caseId, req.user.id);
      if (!deleted) {
        return res.status(404).json({
          success: false,
          error: 'Case not found',
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Case and associated payment records deleted successfully',
      });
    } catch (err) {
      next(err);
    }
  },

  // POST /api/cases/:id/payments
  async addPayment(req, res, next) {
    try {
      const caseId = parseInt(req.params.id, 10);
      if (isNaN(caseId)) {
        return res.status(404).json({
          success: false,
          error: 'Case not found',
        });
      }

      const buyerCase = await CaseModel.findById(caseId, req.user.id);
      if (!buyerCase) {
        return res.status(404).json({
          success: false,
          error: 'Case not found',
        });
      }

      const { amount, paid_on, note } = req.body;
      const parsedAmount = parseFloat(amount);

      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        return res.status(400).json({
          success: false,
          error: 'Payment amount must be a positive number.',
        });
      }

      if (!paid_on || !isValidDate(paid_on)) {
        return res.status(400).json({
          success: false,
          error: 'paid_on is required and must be a valid date within 10 years.',
        });
      }

      const payment = await PaymentModel.create({
        buyer_case_id: caseId,
        amount: parsedAmount,
        paid_on,
        note: note ? note.trim() : null,
      });

      const totalPaid = await PaymentModel.getTotalByCaseId(caseId);

      return res.status(201).json({
        success: true,
        message: 'Payment logged successfully',
        data: payment,
        total_paid: totalPaid,
      });
    } catch (err) {
      next(err);
    }
  },

  // GET /api/cases/:id/payments
  async getPayments(req, res, next) {
    try {
      const caseId = parseInt(req.params.id, 10);
      if (isNaN(caseId)) {
        return res.status(404).json({
          success: false,
          error: 'Case not found',
        });
      }

      const buyerCase = await CaseModel.findById(caseId, req.user.id);
      if (!buyerCase) {
        return res.status(404).json({
          success: false,
          error: 'Case not found',
        });
      }

      const payments = await PaymentModel.findByCaseId(caseId);
      const totalPaid = await PaymentModel.getTotalByCaseId(caseId);

      return res.status(200).json({
        success: true,
        data: payments,
        total_paid: totalPaid,
      });
    } catch (err) {
      next(err);
    }
  },

  // DELETE /api/cases/:id/payments/:paymentId
  async deletePayment(req, res, next) {
    try {
      const caseId = parseInt(req.params.id, 10);
      const paymentId = parseInt(req.params.paymentId, 10);

      if (isNaN(caseId) || isNaN(paymentId)) {
        return res.status(404).json({
          success: false,
          error: 'Payment or Case not found',
        });
      }

      const buyerCase = await CaseModel.findById(caseId, req.user.id);
      if (!buyerCase) {
        return res.status(404).json({
          success: false,
          error: 'Case not found',
        });
      }

      const payment = await PaymentModel.findById(paymentId);
      if (!payment || payment.buyer_case_id !== caseId) {
        return res.status(404).json({
          success: false,
          error: 'Payment record not found for this case',
        });
      }

      await PaymentModel.delete(paymentId);
      const totalPaid = await PaymentModel.getTotalByCaseId(caseId);

      return res.status(200).json({
        success: true,
        message: 'Payment record deleted successfully',
        total_paid: totalPaid,
      });
    } catch (err) {
      next(err);
    }
  },
};
