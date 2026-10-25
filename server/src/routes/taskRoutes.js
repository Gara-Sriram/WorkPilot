import express from 'express';
import {
  createTask,
  getTaskById,
  listTasks,
  startTaskExecution,
  cancelTask,
  retryTask,
} from '../services/taskService.js';
import { rateLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// Create task
router.post('/tasks', rateLimiter({ max: 30 }), async (req, res, next) => {
  try {
    const { userRequest, relevantDocumentIds, autoRun = true } = req.body;

    const task = await createTask({ userRequest, relevantDocumentIds });

    if (autoRun) {
      // Execute asynchronously in background and return the task immediately
      startTaskExecution(task.taskId).catch(err => {
        console.error(`[Task Execution Background Error ${task.taskId}]:`, err.message);
      });
    }

    res.status(201).json({
      success: true,
      task,
    });
  } catch (err) {
    next(err);
  }
});

// List tasks
router.get('/tasks', async (req, res, next) => {
  try {
    const { limit = 50, skip = 0, status } = req.query;
    const result = await listTasks({
      limit: parseInt(limit, 10),
      skip: parseInt(skip, 10),
      status,
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
});

// Get task details
router.get('/tasks/:taskId', async (req, res, next) => {
  try {
    const task = await getTaskById(req.params.taskId);
    if (!task) {
      return res.status(404).json({ error: `Task "${req.params.taskId}" not found.` });
    }

    res.json(task);
  } catch (err) {
    next(err);
  }
});

// Run / Resume task execution
router.post('/tasks/:taskId/run', rateLimiter({ max: 20 }), async (req, res, next) => {
  try {
    const task = await startTaskExecution(req.params.taskId);
    res.json({
      success: true,
      task,
    });
  } catch (err) {
    next(err);
  }
});

// Cancel task
router.post('/tasks/:taskId/cancel', async (req, res, next) => {
  try {
    const task = await cancelTask(req.params.taskId);
    res.json({
      success: true,
      task,
    });
  } catch (err) {
    next(err);
  }
});

// Retry task
router.post('/tasks/:taskId/retry', rateLimiter({ max: 10 }), async (req, res, next) => {
  try {
    const task = await retryTask(req.params.taskId);
    res.json({
      success: true,
      task,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
