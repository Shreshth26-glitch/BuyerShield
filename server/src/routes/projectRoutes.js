import { Router } from 'express';
import { ProjectController } from '../controllers/projectController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

// Public route: search and lookup projects (search-first step)
router.get('/', ProjectController.getAll);

// Authenticated routes
router.get('/:id', authenticateToken, ProjectController.getById);
router.get('/by-rera/:reraNumber', authenticateToken, ProjectController.getByRera);
router.post('/', authenticateToken, ProjectController.create);
router.patch('/:id', authenticateToken, ProjectController.update);

export default router;
