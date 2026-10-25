import { describe, it, expect } from 'vitest';
import { createTask, getTaskById } from '../src/services/taskService.js';
import { toolRegistry } from '../src/tools/index.js';
import { decideApproval, getPendingApprovals } from '../src/services/approvalService.js';

describe('Human-in-the-Loop Approval Governance', () => {
  it('triggers human approval pause when invoice amount exceeds enterprise threshold ($10,000)', async () => {
    const task = await createTask({
      userRequest: 'Process large invoice for Globex Logistics exceeding $10,000',
    });

    // Execute create_finance_record with amount = $14,800
    const result = await toolRegistry.execute('create_finance_record', {
      vendor: 'Globex Logistics Corp.',
      invoiceNumber: 'GLX-TEST-99',
      amount: 14800,
      currency: 'USD',
    }, { task });

    expect(result.success).toBe(true);
    expect(result.data.requiresApproval).toBe(true);
    expect(result.data.approvalId).toBeDefined();

    // Check task state in database
    const updatedTask = await getTaskById(task.taskId);
    expect(updatedTask.status).toBe('WAITING_FOR_APPROVAL');
    expect(updatedTask.approvalState.required).toBe(true);
    expect(updatedTask.approvalState.status).toBe('PENDING');

    // Check pending approvals list
    const pending = await getPendingApprovals();
    expect(pending.some(a => a.approvalId === result.data.approvalId)).toBe(true);
  });

  it('handles rejection cleanly by marking task as FAILED with audit event', async () => {
    const task = await createTask({
      userRequest: 'Process another large invoice to test rejection flow',
    });

    const result = await toolRegistry.execute('create_finance_record', {
      vendor: 'Massive Corp',
      invoiceNumber: 'MC-HIGH-01',
      amount: 25000,
      currency: 'USD',
    }, { task });

    const approvalId = result.data.approvalId;

    // Reject the approval
    const { approval, task: rejectedTask } = await decideApproval({
      approvalId,
      decision: 'REJECTED',
      decidedBy: 'CFO Office',
      comments: 'Invoice amount not authorized in current quarter budget.',
    });

    expect(approval.status).toBe('REJECTED');
    expect(rejectedTask.status).toBe('FAILED');
    expect(rejectedTask.errorDetails).toContain('REJECTED');
  });
});
