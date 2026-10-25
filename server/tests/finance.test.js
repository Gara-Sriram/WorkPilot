import { describe, it, expect } from 'vitest';
import {
  createFinanceRecord,
  getFinanceRecordById,
  getFinanceRecordByBusinessKey,
  DuplicateFinanceRecordError,
} from '../src/services/financeService.js';

describe('Finance Service & Duplicate Record Prevention', () => {
  const testVendor = 'Cyberdyne Systems Corp';
  const testInvoiceNumber = 'CS-800-ALPHA';

  it('creates finance record with exact cents storage', async () => {
    const record = await createFinanceRecord({
      vendor: testVendor,
      invoiceNumber: testInvoiceNumber,
      amount: 1999.95,
      currency: 'USD',
      dueDate: '2025-01-31',
    });

    expect(record.recordId).toBeDefined();
    expect(record.vendor).toBe(testVendor);
    expect(record.amount).toBe(1999.95);
    expect(record.amountCents).toBe(199995); // Exact cents
    expect(record.uniqueCompositeKey).toBe('cyberdynesystemscorp__cs800alpha');
  });

  it('strictly prevents duplicate finance records and throws DuplicateFinanceRecordError', async () => {
    // Attempting to insert the exact same vendor and invoice number
    await expect(
      createFinanceRecord({
        vendor: '  cyberdyne systems corp  ', // testing whitespace and casing normalization
        invoiceNumber: 'cs-800-alpha',
        amount: 2500,
        currency: 'USD',
      })
    ).rejects.toThrow(DuplicateFinanceRecordError);
  });

  it('retrieves created finance record by ID and by business key', async () => {
    const record = await getFinanceRecordByBusinessKey(testVendor, testInvoiceNumber);
    expect(record).toBeDefined();
    expect(record.amount).toBe(1999.95);

    const recordById = await getFinanceRecordById(record.recordId);
    expect(recordById).toBeDefined();
    expect(recordById.uniqueCompositeKey).toBe(record.uniqueCompositeKey);
  });

  it('rejects non-positive amounts with clear error', async () => {
    await expect(
      createFinanceRecord({
        vendor: 'Some Vendor',
        invoiceNumber: 'INV-001',
        amount: 0,
        currency: 'USD',
      })
    ).rejects.toThrow(/positive number/);
  });
});
