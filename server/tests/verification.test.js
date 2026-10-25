import { describe, it, expect } from 'vitest';
import { createFinanceRecord, getFinanceRecordById } from '../src/services/financeService.js';
import { verifyFinanceRecordAgainstSource } from '../src/services/verificationService.js';

describe('Independent Verification Engine', () => {
  it('returns PASSED report when persisted finance record matches source data exactly', async () => {
    const record = await createFinanceRecord({
      vendor: 'Tyrell Corporation',
      invoiceNumber: 'TC-2019-NEXUS',
      amount: 8500.50,
      currency: 'USD',
      dueDate: '2025-05-15',
    });

    const report = await verifyFinanceRecordAgainstSource({
      recordId: record.recordId,
      expectedSourceData: {
        vendor: 'Tyrell Corporation',
        invoiceNumber: 'TC-2019-NEXUS',
        amount: 8500.50,
        currency: 'USD',
        dueDate: '2025-05-15',
      },
    });

    expect(report.passed).toBe(true);
    expect(report.overallStatus).toBe('PASSED');
    expect(report.discrepancies.length).toBe(0);
    expect(report.checks.every(c => c.passed)).toBe(true);

    // Verify DB update
    const updated = await getFinanceRecordById(record.recordId);
    expect(updated.isVerified).toBe(true);
    expect(updated.status).toBe('VERIFIED');
  });

  it('detects discrepancies and returns FAILED report when amount differs', async () => {
    const record = await createFinanceRecord({
      vendor: 'Weyland-Yutani Corp',
      invoiceNumber: 'WY-LV426',
      amount: 5000.00,
      currency: 'USD',
    });

    const report = await verifyFinanceRecordAgainstSource({
      recordId: record.recordId,
      expectedSourceData: {
        vendor: 'Weyland-Yutani Corp',
        invoiceNumber: 'WY-LV426',
        amount: 5200.00, // Discrepancy!
        currency: 'USD',
      },
    });

    expect(report.passed).toBe(false);
    expect(report.overallStatus).toBe('FAILED');
    expect(report.discrepancies.length).toBeGreaterThan(0);
    expect(report.discrepancies.some(d => d.includes('Monetary discrepancy'))).toBe(true);

    // Verify DB update shows verification failed
    const updated = await getFinanceRecordById(record.recordId);
    expect(updated.isVerified).toBe(false);
    expect(updated.status).toBe('VERIFICATION_FAILED');
  });

  it('returns FAILED report when record cannot be found in database', async () => {
    const report = await verifyFinanceRecordAgainstSource({
      recordId: 'non_existent_fin_record_id',
      expectedSourceData: {
        vendor: 'Non Existent',
        invoiceNumber: 'NONE',
        amount: 100,
      },
    });

    expect(report.passed).toBe(false);
    expect(report.overallStatus).toBe('FAILED');
    expect(report.checks[0].check).toBe('RECORD_EXISTENCE');
  });
});
