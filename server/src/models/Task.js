import mongoose from 'mongoose';

const StepSchema = new mongoose.Schema({
  stepId: { type: String, required: true },
  description: { type: String, required: true },
  tool: { type: String, required: true },
  args: { type: mongoose.Schema.Types.Mixed, default: {} },
  status: {
    type: String,
    enum: ['PENDING', 'RUNNING', 'SUCCEEDED', 'FAILED', 'SKIPPED'],
    default: 'PENDING',
  },
  attempts: { type: Number, default: 0 },
  startedAt: { type: Date },
  completedAt: { type: Date },
  result: { type: mongoose.Schema.Types.Mixed },
  error: { type: String },
}, { _id: false });

const ExecutionEventSchema = new mongoose.Schema({
  timestamp: { type: Date, default: Date.now },
  eventType: {
    type: String,
    enum: [
      'TASK_RECEIVED',
      'PLAN_CREATED',
      'TOOL_REQUESTED',
      'TOOL_STARTED',
      'TOOL_SUCCEEDED',
      'TOOL_FAILED',
      'RETRY_SCHEDULED',
      'APPROVAL_REQUESTED',
      'APPROVAL_DECIDED',
      'VERIFICATION_STARTED',
      'VERIFICATION_SUCCEEDED',
      'VERIFICATION_FAILED',
      'TASK_COMPLETED',
      'TASK_FAILED',
      'TASK_CANCELLED'
    ],
    required: true,
  },
  stepId: { type: String },
  tool: { type: String },
  details: { type: String, required: true },
  payload: { type: mongoose.Schema.Types.Mixed },
  error: { type: String },
}, { _id: false });

const VerificationCheckSchema = new mongoose.Schema({
  check: { type: String, required: true },
  passed: { type: Boolean, required: true },
  expected: { type: String },
  actual: { type: String },
  message: { type: String },
}, { _id: false });

const TaskSchema = new mongoose.Schema({
  taskId: { type: String, required: true, unique: true, index: true },
  userRequest: { type: String, required: true, trim: true },
  status: {
    type: String,
    enum: ['PENDING', 'RUNNING', 'WAITING_FOR_APPROVAL', 'VERIFYING', 'COMPLETED', 'FAILED', 'CANCELLED'],
    default: 'PENDING',
    index: true,
  },
  plan: [StepSchema],
  currentStepIndex: { type: Number, default: 0 },
  executionHistory: [ExecutionEventSchema],
  approvalState: {
    required: { type: Boolean, default: false },
    approvalId: { type: String },
    status: {
      type: String,
      enum: ['NONE', 'PENDING', 'APPROVED', 'REJECTED'],
      default: 'NONE',
    },
    reason: { type: String },
    requestedAction: { type: String },
    resolvedAt: { type: Date },
    decidedBy: { type: String },
  },
  relevantDocumentIds: [{ type: String }],
  resultSummary: { type: String },
  verificationReport: {
    passed: { type: Boolean },
    checks: [VerificationCheckSchema],
    verifiedAt: { type: Date },
    financeRecordId: { type: String },
  },
  errorDetails: { type: String },
  toolCallCount: { type: Number, default: 0 },
  completedAt: { type: Date },
}, {
  timestamps: true,
  versionKey: false,
});

TaskSchema.index({ status: 1, createdAt: -1 });

export const Task = mongoose.model('Task', TaskSchema);
