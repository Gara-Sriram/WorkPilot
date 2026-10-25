import { describe, it, expect } from 'vitest';
import { createTask, getTaskById, cancelTask } from '../src/services/taskService.js';
import { agentRuntime } from '../src/agent/runtime.js';
import { getFinanceRecordByBusinessKey, getFinanceRecordById } from '../src/services/financeService.js';

describe('End-to-End Autonomous Workflow Execution', () => {
  it('rejects empty or excessively short task instructions', async () => {
    await expect(createTask({ userRequest: '' })).rejects.toThrow(/Task instruction is required/);
    await expect(createTask({ userRequest: 'hi' })).rejects.toThrow(/at least 3 characters/);
  });

  it('executes full end-to-end invoice workflow to verified completion for Acme Technologies invoice', async () => {
    // 1. Create Task
    const task = await createTask({
      userRequest: 'Find the latest Acme Technologies invoice, extract its details, create a finance record, and verify it.',
    });

    expect(task.taskId).toBeDefined();
    expect(task.status).toBe('PENDING');

    // 2. Run Autonomous Agent Loop
    const completedTask = await agentRuntime.runTask(task.taskId);
    if (completedTask.status !== 'COMPLETED') {
      console.log('WORKFLOW FAILED ERROR DETAILS:', completedTask.errorDetails);
      console.log('PLAN STEPS:', JSON.stringify(completedTask.plan, null, 2));
    }

    // 3. Assert Task Reached COMPLETED status
    expect(completedTask.status).toBe('COMPLETED');
    expect(completedTask.completedAt).toBeDefined();
    expect(completedTask.plan.length).toBeGreaterThanOrEqual(4);

    // 4. Assert All Steps Succeeded
    const allStepsSucceeded = completedTask.plan.every(s => s.status === 'SUCCEEDED');
    expect(allStepsSucceeded).toBe(true);

    // 5. Assert Independent Verification Passed
    expect(completedTask.verificationReport).toBeDefined();
    expect(completedTask.verificationReport.passed).toBe(true);
    expect(completedTask.verificationReport.checks.length).toBeGreaterThan(0);

    // 6. Assert Finance Record Exists in MongoDB with exact details
    const recordId = completedTask.verificationReport.financeRecordId;
    expect(recordId).toBeDefined();
    const record = await getFinanceRecordById(recordId);
    expect(record).toBeDefined();
    expect(record.amount).toBe(2450.00);
    expect(record.isVerified).toBe(true);
    expect(record.status).toBe('VERIFIED');

    // 7. Verify Timeline Events
    const events = completedTask.executionHistory.map(e => e.eventType);
    expect(events).toContain('TASK_RECEIVED');
    expect(events).toContain('PLAN_CREATED');
    expect(events).toContain('TOOL_REQUESTED');
    expect(events).toContain('TOOL_SUCCEEDED');
    expect(events).toContain('VERIFICATION_STARTED');
    expect(events).toContain('VERIFICATION_SUCCEEDED');
    expect(events).toContain('TASK_COMPLETED');
  });

  it('fails gracefully when requested document does not exist', async () => {
    const task = await createTask({
      userRequest: 'Process invoice for NonExistentPhantomVendor9999 and verify it.',
    });

    const failedTask = await agentRuntime.runTask(task.taskId);

    // Should not complete successfully when document is missing
    expect(failedTask.status).toBe('FAILED');
    expect(failedTask.errorDetails).toBeDefined();
  });

  it('prevents cancelling already completed tasks', async () => {
    const task = await createTask({
      userRequest: 'Process Acme invoice again test',
    });
    task.status = 'COMPLETED';
    await task.save();

    await expect(cancelTask(task.taskId)).rejects.toThrow(/Cannot cancel task already in COMPLETED status/);
  });
});
