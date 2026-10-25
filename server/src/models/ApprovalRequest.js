import mongoose from 'mongoose';

const ApprovalRequestSchema = new mongoose.Schema({
  approvalId: { type: String, required: true, unique: true, index: true },
  taskId: { type: String, required: true, ref: 'Task', index: true },
  tool: { type: String, required: true },
  actionDescription: { type: String, required: true },
  reason: { type: String, required: true },
  amount: { type: Number },
  currency: { type: String, default: 'USD' },
  context: { type: mongoose.Schema.Types.Mixed, default: {} },
  status: {
    type: String,
    enum: ['PENDING', 'APPROVED', 'REJECTED'],
    default: 'PENDING',
    index: true,
  },
  decidedBy: { type: String },
  decidedAt: { type: Date },
  comments: { type: String },
}, {
  timestamps: true,
});

ApprovalRequestSchema.index({ status: 1, createdAt: -1 });

export const ApprovalRequest = mongoose.model('ApprovalRequest', ApprovalRequestSchema);
