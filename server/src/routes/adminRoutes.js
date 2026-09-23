import { Router } from 'express';
import { AdminSyncController } from '../controllers/adminSyncController.js';
import { AdminPolicyController } from '../controllers/adminPolicyController.js';
import { AdminPrecedentController } from '../controllers/adminPrecedentController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: 'Forbidden: Administrative credentials required.',
    });
  }
  next();
};

// All admin routes require authentication and admin role
router.use(authenticateToken);
router.use(requireAdmin);

// Admin Sync Monitoring routes
router.get('/sync/jobs', AdminSyncController.getJobs);
router.get('/sync/stats', AdminSyncController.getStats);
router.post('/sync/retry/:jobId', AdminSyncController.retryJob);

// Admin Interest Rate Policy routes
router.get('/interest-rates', AdminPolicyController.getAllPolicies);
router.get('/interest-rates/:id', AdminPolicyController.getPolicyById);
router.post('/interest-rates', AdminPolicyController.createPolicy);
router.put('/interest-rates/:id', AdminPolicyController.updatePolicy);
router.delete('/interest-rates/:id', AdminPolicyController.deletePolicy);

// Admin Precedent Management routes
router.post('/precedents/extract', AdminPrecedentController.extractPrecedent);
router.get('/precedents', AdminPrecedentController.listPrecedents);
router.post('/precedents', AdminPrecedentController.createPrecedent);
router.put('/precedents/:id', AdminPrecedentController.updatePrecedent);
router.delete('/precedents/:id', AdminPrecedentController.deletePrecedent);

export default router;

