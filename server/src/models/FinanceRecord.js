import mongoose from 'mongoose';

const FinanceRecordSchema = new mongoose.Schema({
  recordId: { type: String, required: true, unique: true, index: true },
  vendor: { type: String, required: true, trim: true },
  vendorNormalized: { type: String, required: true, index: true },
  invoiceNumber: { type: String, required: true, trim: true },
  invoiceNumberNormalized: { type: String, required: true, index: true },
  // Unique composite key ensures strict database-level protection against duplicates
  uniqueCompositeKey: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  invoiceDate: { type: Date },
  dueDate: { type: Date },
  amount: { type: Number, required: true },
  amountCents: { type: Number, required: true }, // Exact integer minor currency unit (e.g. cents)
  currency: { type: String, required: true, default: 'USD', uppercase: true },
  lineItems: [{
    description: String,
    quantity: Number,
    unitPrice: Number,
    total: Number,
  }],
  documentId: { type: String, ref: 'Document' },
  taskId: { type: String, ref: 'Task' },
  isVerified: { type: Boolean, default: false },
  verifiedAt: { type: Date },
  verificationNotes: { type: String },
  status: {
    type: String,
    enum: ['PENDING_VERIFICATION', 'VERIFIED', 'VERIFICATION_FAILED'],
    default: 'PENDING_VERIFICATION',
  },
}, {
  timestamps: true,
});

FinanceRecordSchema.index({ vendorNormalized: 1, invoiceNumberNormalized: 1 });
FinanceRecordSchema.index({ createdAt: -1 });

export const FinanceRecord = mongoose.model('FinanceRecord', FinanceRecordSchema);

export function normalizeVendor(vendor) {
  if (!vendor) return '';
  return vendor.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
}

export function normalizeInvoiceNumber(invNum) {
  if (!invNum) return '';
  return invNum.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
}

export function buildCompositeKey(vendor, invoiceNumber) {
  return `${normalizeVendor(vendor)}__${normalizeInvoiceNumber(invoiceNumber)}`;
}
