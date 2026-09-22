import express from 'express';
import cors from 'cors';
import { config } from './config/index.js';
import authRoutes from './routes/authRoutes.js';
import projectRoutes from './routes/projectRoutes.js';
import caseRoutes from './routes/caseRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import { SyncService } from './services/SyncService.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();

// Middlewares
app.use(cors({
  origin: [config.clientUrl, 'http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true,
}));
app.use(express.json());

// Health Check
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'BuyerShield API',
    timestamp: new Date().toISOString(),
    version: '0.1.0',
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/cases', caseRoutes);
app.use('/api/admin', adminRoutes);

// Initialize background scheduler in non-test mode
if (process.env.NODE_ENV !== 'test') {
  SyncService.initScheduler();
}

// Centralized error handler
app.use(errorHandler);

export default app;

