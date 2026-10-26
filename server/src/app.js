import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { env } from './config/env.js';
import healthRoutes from './routes/healthRoutes.js';
import taskRoutes from './routes/taskRoutes.js';
import documentRoutes from './routes/documentRoutes.js';
import financeRoutes from './routes/financeRoutes.js';
import approvalRoutes from './routes/approvalRoutes.js';
import demoRoutes from './routes/demoRoutes.js';
import { errorHandler } from './middleware/errorHandler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientDist = path.resolve(__dirname, '../../client/dist');

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

// Serve static frontend in production if built
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

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
