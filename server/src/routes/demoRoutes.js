import express from 'express';
import { seedDemoData } from '../services/demoSeeder.js';
import { env } from '../config/env.js';
import { Task } from '../models/Task.js';
import { FinanceRecord } from '../models/FinanceRecord.js';
import { DocumentModel } from '../models/Document.js';
import { ApprovalRequest } from '../models/ApprovalRequest.js';

const router = express.Router();

// Seed or reset demo data
router.post('/demo/seed', async (req, res, next) => {
  try {
    const { reset = false } = req.body;
    const result = await seedDemoData({ reset });
    res.json({
      success: true,
      ...result,
    });
  } catch (err) {
    next(err);
  }
});

// Demo & environment status overview
router.get('/demo/status', async (req, res, next) => {
  try {
    const [taskCount, completedTasks, failedTasks, waitingApprovals, docCount, financeCount] = await Promise.all([
      Task.countDocuments(),
      Task.countDocuments({ status: 'COMPLETED' }),
      Task.countDocuments({ status: 'FAILED' }),
      Task.countDocuments({ status: 'WAITING_FOR_APPROVAL' }),
      DocumentModel.countDocuments(),
      FinanceRecord.countDocuments(),
    ]);

    res.json({
      environment: {
        isLiveAI: env.isLiveAI,
        geminiModel: env.GEMINI_MODEL,
        hasApiKey: Boolean(env.GEMINI_API_KEY && env.GEMINI_API_KEY.length > 5),
        mode: env.isLiveAI ? 'LIVE_AI' : 'DETERMINISTIC_DEMO_FIXTURE',
        nodeEnv: env.NODE_ENV,
        approvalThreshold: env.APPROVAL_THRESHOLD_AMOUNT,
      },
      stats: {
        totalTasks: taskCount,
        completedTasks,
        failedTasks,
        waitingApprovals,
        totalDocuments: docCount,
        totalFinanceRecords: financeCount,
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
