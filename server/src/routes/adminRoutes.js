import { Router } from 'express';
import { AdminSyncController } from '../controllers/adminSyncController.js';
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

export default router;
