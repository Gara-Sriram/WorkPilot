import crypto from 'crypto';
import { ApprovalRequest } from '../models/ApprovalRequest.js';
import { Task } from '../models/Task.js';

export async function createApprovalRequest({
  taskId,
  tool,
  actionDescription,
  reason,
  amount,
  currency = 'USD',
  context = {},
}) {
  const approvalId = `appr_${crypto.randomBytes(6).toString('hex')}`;

  const request = await ApprovalRequest.create({
    approvalId,
    taskId,
    tool,
    actionDescription,
    reason,
    amount,
    currency,
    context,
    status: 'PENDING',
  });

  // Update Task approvalState and pause status
  await Task.findOneAndUpdate(
    { taskId },
    {
      $set: {
        status: 'WAITING_FOR_APPROVAL',
        'approvalState.required': true,
        'approvalState.approvalId': approvalId,
        'approvalState.status': 'PENDING',
        'approvalState.reason': reason,
        'approvalState.requestedAction': actionDescription,
      },
      $push: {
        executionHistory: {
          timestamp: new Date(),
          eventType: 'APPROVAL_REQUESTED',
          tool,
          details: `Execution paused: Human approval required for ${actionDescription}. Reason: ${reason}`,
          payload: { approvalId, amount, currency },
        },
      },
    }
  );

  return request;
}

export async function getPendingApprovals() {
  return ApprovalRequest.find({ status: 'PENDING' }).sort({ createdAt: -1 }).lean();
}

export async function getAllApprovals({ limit = 50, skip = 0 } = {}) {
  const [approvals, total] = await Promise.all([
    ApprovalRequest.find().sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    ApprovalRequest.countDocuments(),
  ]);
  return { approvals, total };
}

export async function getApprovalById(approvalId) {
  return ApprovalRequest.findOne({ approvalId }).lean();
}

export async function decideApproval({ approvalId, decision, decidedBy = 'Operator', comments = '' }) {
  if (!['APPROVED', 'REJECTED'].includes(decision)) {
    throw new Error('Decision must be either APPROVED or REJECTED');
  }

  const approval = await ApprovalRequest.findOne({ approvalId });
  if (!approval) {
    throw new Error(`Approval request with ID "${approvalId}" not found.`);
  }

  if (approval.status !== 'PENDING') {
    throw new Error(`Approval request is already in status "${approval.status}".`);
  }

  approval.status = decision;
  approval.decidedBy = decidedBy;
  approval.decidedAt = new Date();
  approval.comments = comments;
  await approval.save();

  // Update Task record
  const task = await Task.findOne({ taskId: approval.taskId });
  if (task) {
    task.approvalState.status = decision;
    task.approvalState.resolvedAt = new Date();
    task.approvalState.decidedBy = decidedBy;

    task.executionHistory.push({
      timestamp: new Date(),
      eventType: 'APPROVAL_DECIDED',
      tool: approval.tool,
      details: `Human decision recorded: ${decision} by ${decidedBy}. Comments: ${comments || 'None'}`,
      payload: { approvalId, decision, decidedBy, comments },
    });

    if (decision === 'REJECTED') {
      task.status = 'FAILED';
      task.errorDetails = `Task failed because required approval was REJECTED: ${comments || 'Operator rejected this sensitive action'}`;
      task.completedAt = new Date();
    } else {
      // Set to RUNNING so agent execution loop can resume
      task.status = 'RUNNING';
    }

    await task.save();
  }

  return { approval, task };
}
