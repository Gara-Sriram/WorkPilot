import express from 'express';
import {
  getAllApprovals,
  getPendingApprovals,
  getApprovalById,
  decideApproval,
} from '../services/approvalService.js';
import { agentRuntime } from '../agent/runtime.js';
import { rateLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// List approvals
router.get('/approvals', async (req, res, next) => {
  try {
    const { status, limit = 50, skip = 0 } = req.query;

    if (status === 'PENDING') {
      const pending = await getPendingApprovals();
      return res.json({ approvals: pending, total: pending.length });
    }

    const result = await getAllApprovals({
      limit: parseInt(limit, 10),
      skip: parseInt(skip, 10),
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
});

// Get approval details
router.get('/approvals/:approvalId', async (req, res, next) => {
  try {
    const approval = await getApprovalById(req.params.approvalId);
    if (!approval) {
      return res.status(404).json({ error: `Approval request "${req.params.approvalId}" not found.` });
    }

    res.json(approval);
  } catch (err) {
    next(err);
  }
});

// Approve sensitive action
router.post('/approvals/:approvalId/approve', rateLimiter({ max: 20 }), async (req, res, next) => {
  try {
    const { decidedBy = 'Enterprise Officer', comments = '' } = req.body;

    const { approval, task } = await decideApproval({
      approvalId: req.params.approvalId,
      decision: 'APPROVED',
      decidedBy,
      comments,
    });

    // Resume the task execution loop in background
    if (task && task.taskId) {
      agentRuntime.runTask(task.taskId).catch(err => {
        console.error(`[Resume Task Execution Error ${task.taskId}]:`, err.message);
      });
    }

    res.json({
      success: true,
      approval,
      message: 'Action approved successfully. Task execution resumed.',
    });
  } catch (err) {
    next(err);
  }
});

// Reject sensitive action
router.post('/approvals/:approvalId/reject', rateLimiter({ max: 20 }), async (req, res, next) => {
  try {
    const { decidedBy = 'Enterprise Officer', comments = '' } = req.body;

    const { approval, task } = await decideApproval({
      approvalId: req.params.approvalId,
      decision: 'REJECTED',
      decidedBy,
      comments,
    });

    res.json({
      success: true,
      approval,
      message: 'Action rejected. Task halted and marked as failed.',
    });
  } catch (err) {
    next(err);
  }
});

export default router;
