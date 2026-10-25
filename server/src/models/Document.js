import mongoose from 'mongoose';

const DocumentSchema = new mongoose.Schema({
  documentId: { type: String, required: true, unique: true, index: true },
  originalName: { type: String, required: true },
  mimeType: { type: String, required: true, default: 'application/pdf' },
  size: { type: Number, required: true },
  storagePath: { type: String, required: true },
  extractedText: { type: String, default: '' },
  extractionStatus: {
    type: String,
    enum: ['PENDING', 'SUCCESS', 'FAILED'],
    default: 'PENDING',
    index: true,
  },
  extractionError: { type: String },
  vendorGuess: { type: String },
  invoiceNumberGuess: { type: String },
  isSample: { type: Boolean, default: false },
}, {
  timestamps: true,
});

DocumentSchema.index({ vendorGuess: 1, invoiceNumberGuess: 1 });
DocumentSchema.index({ createdAt: -1 });

export const DocumentModel = mongoose.model('Document', DocumentSchema);
