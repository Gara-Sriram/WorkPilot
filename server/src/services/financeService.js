import crypto from 'crypto';
import { FinanceRecord, buildCompositeKey, normalizeVendor, normalizeInvoiceNumber } from '../models/FinanceRecord.js';

export class DuplicateFinanceRecordError extends Error {
  constructor(vendor, invoiceNumber) {
    super(`A finance record for vendor "${vendor}" with invoice number "${invoiceNumber}" already exists.`);
    this.name = 'DuplicateFinanceRecordError';
    this.vendor = vendor;
    this.invoiceNumber = invoiceNumber;
    this.code = 'DUPLICATE_FINANCE_RECORD';
  }
}

export async function createFinanceRecord({
  vendor,
  invoiceNumber,
  amount,
  currency = 'USD',
  invoiceDate,
  dueDate,
  lineItems = [],
  documentId = null,
  taskId = null,
}) {
  if (!vendor || !vendor.trim()) {
    throw new Error('Vendor name is required to create a finance record.');
  }
  if (!invoiceNumber || !invoiceNumber.trim()) {
    throw new Error('Invoice number is required to create a finance record.');
  }
  if (amount === undefined || amount === null || isNaN(Number(amount)) || Number(amount) <= 0) {
    throw new Error('Amount must be a positive number.');
  }

  const numAmount = parseFloat(Number(amount).toFixed(2));
  const amountCents = Math.round(numAmount * 100);
  const vNorm = normalizeVendor(vendor);
  const invNorm = normalizeInvoiceNumber(invoiceNumber);
  const compositeKey = buildCompositeKey(vendor, invoiceNumber);

  // Check if existing record already exists prior to insertion
  const existing = await FinanceRecord.findOne({ uniqueCompositeKey: compositeKey });
  if (existing) {
    throw new DuplicateFinanceRecordError(vendor, invoiceNumber);
  }

  const recordId = `fin_${crypto.randomBytes(6).toString('hex')}`;

  try {
    const record = await FinanceRecord.create({
      recordId,
      vendor: vendor.trim(),
      vendorNormalized: vNorm,
      invoiceNumber: invoiceNumber.trim(),
      invoiceNumberNormalized: invNorm,
      uniqueCompositeKey: compositeKey,
      amount: numAmount,
      amountCents,
      currency: currency.toUpperCase().trim(),
      invoiceDate: invoiceDate ? new Date(invoiceDate) : undefined,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      lineItems,
      documentId,
      taskId,
      isVerified: false,
      status: 'PENDING_VERIFICATION',
    });

    return record;
  } catch (err) {
    if (err.code === 11000) {
      throw new DuplicateFinanceRecordError(vendor, invoiceNumber);
    }
    throw err;
  }
}

export async function getFinanceRecordById(recordId) {
  return FinanceRecord.findOne({ recordId }).lean();
}

export async function getFinanceRecordByBusinessKey(vendor, invoiceNumber) {
  const compositeKey = buildCompositeKey(vendor, invoiceNumber);
  return FinanceRecord.findOne({ uniqueCompositeKey: compositeKey }).lean();
}

export async function listFinanceRecords({ limit = 50, skip = 0, isVerified } = {}) {
  const filter = {};
  if (typeof isVerified === 'boolean') {
    filter.isVerified = isVerified;
  }

  const [records, total] = await Promise.all([
    FinanceRecord.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    FinanceRecord.countDocuments(filter),
  ]);

  return { records, total };
}

export async function updateFinanceRecordVerification(recordId, { isVerified, verificationNotes, status }) {
  return FinanceRecord.findOneAndUpdate(
    { recordId },
    {
      $set: {
        isVerified,
        verificationNotes,
        status: status || (isVerified ? 'VERIFIED' : 'VERIFICATION_FAILED'),
        verifiedAt: new Date(),
      },
    },
    { new: true }
  );
}
