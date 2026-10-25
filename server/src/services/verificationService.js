import { getFinanceRecordById, getFinanceRecordByBusinessKey, updateFinanceRecordVerification } from './financeService.js';
import { normalizeVendor, normalizeInvoiceNumber } from '../models/FinanceRecord.js';

export async function verifyFinanceRecordAgainstSource({
  recordId,
  vendor,
  invoiceNumber,
  expectedSourceData,
}) {
  let record = null;
  if (recordId) {
    record = await getFinanceRecordById(recordId);
  } else if (vendor && invoiceNumber) {
    record = await getFinanceRecordByBusinessKey(vendor, invoiceNumber);
  }

  const checks = [];

  if (!record) {
    checks.push({
      check: 'RECORD_EXISTENCE',
      passed: false,
      expected: 'Persisted record in database',
      actual: 'null (record not found)',
      message: 'Failed to retrieve finance record from database for independent verification.',
    });

    return {
      passed: false,
      checks,
      overallStatus: 'FAILED',
      discrepancies: ['Persisted finance record does not exist.'],
      verifiedAt: new Date(),
      record: null,
    };
  }

  // 1. Check Vendor Match (normalized)
  const normExpectedVendor = normalizeVendor(expectedSourceData.vendor);
  const normActualVendor = normalizeVendor(record.vendor);
  const vendorMatches = normExpectedVendor === normActualVendor;
  checks.push({
    check: 'VENDOR_MATCH',
    passed: vendorMatches,
    expected: expectedSourceData.vendor,
    actual: record.vendor,
    message: vendorMatches
      ? `Vendor matches correctly: "${record.vendor}"`
      : `Vendor discrepancy: Expected "${expectedSourceData.vendor}", found "${record.vendor}"`,
  });

  // 2. Check Invoice Number Match (normalized)
  const normExpectedInv = normalizeInvoiceNumber(expectedSourceData.invoiceNumber);
  const normActualInv = normalizeInvoiceNumber(record.invoiceNumber);
  const invMatches = normExpectedInv === normActualInv;
  checks.push({
    check: 'INVOICE_NUMBER_MATCH',
    passed: invMatches,
    expected: expectedSourceData.invoiceNumber,
    actual: record.invoiceNumber,
    message: invMatches
      ? `Invoice number matches correctly: "${record.invoiceNumber}"`
      : `Invoice number discrepancy: Expected "${expectedSourceData.invoiceNumber}", found "${record.invoiceNumber}"`,
  });

  // 3. Check Amount and Minor Units (exact cents check)
  const expectedAmountFloat = parseFloat(Number(expectedSourceData.amount).toFixed(2));
  const expectedCents = Math.round(expectedAmountFloat * 100);
  const actualCents = record.amountCents ?? Math.round(record.amount * 100);
  const amountMatches = expectedCents === actualCents;
  checks.push({
    check: 'AMOUNT_EXACT_MATCH',
    passed: amountMatches,
    expected: `${expectedAmountFloat} (cents: ${expectedCents})`,
    actual: `${record.amount} (cents: ${actualCents})`,
    message: amountMatches
      ? `Monetary value matches exactly: ${record.currency} ${record.amount}`
      : `Monetary discrepancy: Expected ${expectedAmountFloat}, but recorded ${record.amount}`,
  });

  // 4. Check Currency
  const expectedCurrency = (expectedSourceData.currency || 'USD').toUpperCase().trim();
  const actualCurrency = (record.currency || 'USD').toUpperCase().trim();
  const currencyMatches = expectedCurrency === actualCurrency;
  checks.push({
    check: 'CURRENCY_MATCH',
    passed: currencyMatches,
    expected: expectedCurrency,
    actual: actualCurrency,
    message: currencyMatches
      ? `Currency matches: ${actualCurrency}`
      : `Currency discrepancy: Expected ${expectedCurrency}, found ${actualCurrency}`,
  });

  // 5. Check Due Date if available
  if (expectedSourceData.dueDate) {
    const expectedDueStr = new Date(expectedSourceData.dueDate).toISOString().slice(0, 10);
    const actualDueStr = record.dueDate ? new Date(record.dueDate).toISOString().slice(0, 10) : 'null';
    const dueMatches = expectedDueStr === actualDueStr;
    checks.push({
      check: 'DUE_DATE_MATCH',
      passed: dueMatches,
      expected: expectedDueStr,
      actual: actualDueStr,
      message: dueMatches
        ? `Due date matches: ${actualDueStr}`
        : `Due date discrepancy: Expected ${expectedDueStr}, recorded ${actualDueStr}`,
    });
  }

  const allPassed = checks.every(c => c.passed);
  const failedChecks = checks.filter(c => !c.passed);
  const discrepancies = failedChecks.map(c => c.message);

  // Update finance record verification status in database
  await updateFinanceRecordVerification(record.recordId, {
    isVerified: allPassed,
    verificationNotes: allPassed
      ? 'All independent verification checks passed.'
      : `Verification failed with discrepancies: ${discrepancies.join('; ')}`,
    status: allPassed ? 'VERIFIED' : 'VERIFICATION_FAILED',
  });

  return {
    passed: allPassed,
    checks,
    overallStatus: allPassed ? 'PASSED' : 'FAILED',
    discrepancies,
    verifiedAt: new Date(),
    financeRecordId: record.recordId,
    record,
  };
}
