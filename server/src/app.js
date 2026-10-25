import express from 'express';
import cors from 'cors';
import { env } from './config/env.js';
import healthRoutes from './routes/healthRoutes.js';
import taskRoutes from './routes/taskRoutes.js';
import documentRoutes from './routes/documentRoutes.js';
import financeRoutes from './routes/financeRoutes.js';
import approvalRoutes from './routes/approvalRoutes.js';
import demoRoutes from './routes/demoRoutes.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();

// Security & Cross-Origin Resource Sharing
app.use(cors({
  origin: [env.CLIENT_ORIGIN, 'http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true,
}));

// Body parsing with safe payload limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Mount API routes
app.use('/api', healthRoutes);
app.use('/api', taskRoutes);
app.use('/api', documentRoutes);
app.use('/api', financeRoutes);
app.use('/api', approvalRoutes);
app.use('/api', demoRoutes);

// 404 Fallback for unknown API endpoints
app.use('/api/*', (req, res) => {
  res.status(404).json({
    error: `API endpoint not found: ${req.method} ${req.originalUrl}`,
    code: 'ROUTE_NOT_FOUND',
  });
});

// Centralized error handling
app.use(errorHandler);

export default app;
