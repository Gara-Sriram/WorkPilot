import { describe, it, expect } from 'vitest';
import { toolRegistry } from '../src/tools/index.js';

describe('Tool Registry & Tool Validation', () => {
  it('rejects unknown tool execution cleanly', async () => {
    const result = await toolRegistry.execute('unregistered_shell_execution', { cmd: 'rm -rf' });
    expect(result.success).toBe(false);
    expect(result.error).toContain('Unknown tool "unregistered_shell_execution"');
  });

  it('validates tool arguments and rejects missing required fields (extract_invoice)', async () => {
    // extract_invoice requires documentId
    expect(() => {
      toolRegistry.validateArgs('extract_invoice', {});
    }).toThrow(/Validation failed for tool "extract_invoice"/);
  });

  it('validates invoice values correctly (positive amounts, valid currencies)', async () => {
    const validResult = await toolRegistry.execute('validate_invoice', {
      vendor: 'Acme Technologies Inc.',
      invoiceNumber: 'INV-2024-001',
      amount: 2450.00,
      currency: 'USD',
      dueDate: '2024-11-15',
    });

    expect(validResult.success).toBe(true);
    expect(validResult.data.isValid).toBe(true);
    expect(validResult.data.status).toBe('VALIDATION_PASSED');
  });

  it('rejects negative or zero monetary amount in validate_invoice', async () => {
    const invalidResult = await toolRegistry.execute('validate_invoice', {
      vendor: 'Acme Technologies',
      invoiceNumber: 'INV-100',
      amount: -500,
      currency: 'USD',
    });

    expect(invalidResult.success).toBe(false);
    expect(invalidResult.error).toContain('Amount must be a positive number');
  });

  it('flags unsupported currency and invalid date formats in validate_invoice', async () => {
    const res = await toolRegistry.execute('validate_invoice', {
      vendor: 'Acme Technologies',
      invoiceNumber: 'INV-100',
      amount: 100,
      currency: 'XYZ_FAKE_CURRENCY',
      dueDate: 'not-a-valid-date-string',
    });

    expect(res.success).toBe(true);
    expect(res.data.isValid).toBe(false);
    expect(res.data.issues.length).toBeGreaterThan(0);
    expect(res.data.issues.some(i => i.includes('XYZ_FAKE_CURRENCY'))).toBe(true);
    expect(res.data.issues.some(i => i.includes('not a valid date'))).toBe(true);
  });
});
