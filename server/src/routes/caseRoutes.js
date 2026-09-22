import { Router } from 'express';
import { CaseController } from '../controllers/caseController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

// All case and payment routes are protected by JWT authentication
router.use(authenticateToken);

// Buyer Cases
router.get('/', CaseController.getMyCases);
router.get('/:id', CaseController.getCaseById);
router.post('/', CaseController.createCase);
router.patch('/:id', CaseController.updateCase);
router.delete('/:id', CaseController.deleteCase);
router.post('/:id/sync', CaseController.syncCaseProject);

// Payments
router.post('/:id/payments', CaseController.addPayment);
router.get('/:id/payments', CaseController.getPayments);
router.delete('/:id/payments/:paymentId', CaseController.deletePayment);

export default router;
