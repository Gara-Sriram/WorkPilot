import express from 'express';
import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { getActiveDbUri } from '../config/db.js';

const router = express.Router();

router.get('/health', (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';

  res.json({
    status: 'healthy',
    product: 'WorkPilot',
    tagline: 'From instructions to verified outcomes',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: {
      status: dbStatus,
      isInMemory: !env.MONGODB_URI,
    },
    aiEngine: {
      provider: 'Google Gemini',
      model: env.GEMINI_MODEL,
      mode: env.isLiveAI ? 'LIVE_GEMINI' : 'DETERMINISTIC_DEMO_FIXTURE',
      isLiveAI: env.isLiveAI,
      hasApiKeyConfigured: Boolean(env.GEMINI_API_KEY && env.GEMINI_API_KEY.length > 5),
    },
    limits: {
      maxToolCalls: env.MAX_TOOL_CALLS,
      maxRetries: env.MAX_RETRIES,
      taskTimeoutMs: env.TASK_TIMEOUT_MS,
      approvalThresholdAmount: env.APPROVAL_THRESHOLD_AMOUNT,
    },
  });
});

export default router;
