import crypto from 'crypto';
import { Task } from '../models/Task.js';
import { agentRuntime } from '../agent/runtime.js';

export async function createTask({ userRequest, relevantDocumentIds = [] }) {
  if (!userRequest || typeof userRequest !== 'string') {
    throw new Error('Task instruction is required and must be a string.');
  }

  const trimmed = userRequest.trim();
  if (trimmed.length < 3) {
    throw new Error('Task instruction is too short. Please provide a clear objective (at least 3 characters).');
  }
  if (trimmed.length > 2000) {
    throw new Error('Task instruction exceeds maximum allowed length of 2000 characters.');
  }

  const taskId = `task_${crypto.randomBytes(6).toString('hex')}`;

  const task = await Task.create({
    taskId,
    userRequest: trimmed,
    status: 'PENDING',
    relevantDocumentIds,
    plan: [],
    currentStepIndex: 0,
    executionHistory: [],
    toolCallCount: 0,
  });

  return task;
}

export async function getTaskById(taskId) {
  return Task.findOne({ taskId }).lean();
}

export async function listTasks({ limit = 50, skip = 0, status } = {}) {
  const filter = {};
  if (status && status !== 'ALL') {
    filter.status = status;
  }

  const [tasks, total] = await Promise.all([
    Task.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Task.countDocuments(filter),
  ]);

  return { tasks, total };
}

export async function startTaskExecution(taskId) {
  const task = await Task.findOne({ taskId });
  if (!task) {
    throw new Error(`Task ${taskId} not found.`);
  }

  if (['COMPLETED', 'RUNNING'].includes(task.status)) {
    return task;
  }

  // Atomically claim execution so concurrent requests don't collide
  const claimed = await Task.findOneAndUpdate(
    { taskId, status: { $in: ['PENDING', 'WAITING_FOR_APPROVAL'] } },
    { $set: { status: 'RUNNING' } },
    { new: true }
  );

  if (!claimed) {
    return Task.findOne({ taskId });
  }

  // Run in agent runtime
  return agentRuntime.runTask(taskId);
}

export async function cancelTask(taskId) {
  const task = await Task.findOne({ taskId });
  if (!task) {
    throw new Error(`Task ${taskId} not found.`);
  }

  if (['COMPLETED', 'FAILED'].includes(task.status)) {
    throw new Error(`Cannot cancel task already in ${task.status} status.`);
  }

  task.status = 'CANCELLED';
  task.completedAt = new Date();
  task.executionHistory.push({
    timestamp: new Date(),
    eventType: 'TASK_CANCELLED',
    details: 'Task was explicitly cancelled by operator.',
  });

  await task.save();
  return task;
}

export async function retryTask(taskId) {
  const task = await Task.findOne({ taskId });
  if (!task) {
    throw new Error(`Task ${taskId} not found.`);
  }

  if (task.status === 'COMPLETED') {
    throw new Error('Task has already completed successfully and cannot be retried.');
  }

  // Reset task to pending step or initial execution
  task.status = 'PENDING';
  task.errorDetails = null;
  task.toolCallCount = 0;

  // Reset any failed steps so they can be cleanly executed
  if (task.plan && Array.isArray(task.plan)) {
    for (const step of task.plan) {
      if (step.status === 'FAILED') {
        step.status = 'PENDING';
        step.attempts = 0;
        step.error = null;
      }
    }
  }

  task.executionHistory.push({
    timestamp: new Date(),
    eventType: 'RETRY_SCHEDULED',
    details: 'Task execution restart initiated by operator.',
  });

  await task.save();
  return agentRuntime.runTask(taskId);
}

/**
 * Handle server restarts sensibly:
 * Find any tasks that were running when the server shut down and mark them appropriately.
 */
export async function recoverInterruptedTasks() {
  const interrupted = await Task.find({
    status: { $in: ['RUNNING', 'VERIFYING'] },
  });

  if (interrupted.length > 0) {
    console.log(`[Task Recovery] Found ${interrupted.length} interrupted task(s) from previous server session.`);
    for (const task of interrupted) {
      task.status = 'FAILED';
      task.errorDetails = 'Task execution was safely interrupted by a server restart. Can be retried by operator.';
      task.executionHistory.push({
        timestamp: new Date(),
        eventType: 'TASK_FAILED',
        details: 'Server restart detected during task execution. Operation halted safely to avoid non-idempotent replays.',
      });
      await task.save();
    }
  }
}
