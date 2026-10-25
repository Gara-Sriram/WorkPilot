import { z } from 'zod';
import { toolRegistry } from './registry.js';
import { searchDocuments, getDocumentFull } from '../services/documentService.js';
import { createFinanceRecord, getFinanceRecordById, getFinanceRecordByBusinessKey } from '../services/financeService.js';
import { verifyFinanceRecordAgainstSource } from '../services/verificationService.js';
import { createApprovalRequest } from '../services/approvalService.js';
import { env } from '../config/env.js';
import { extractInvoiceDetailsFromText } from '../agent/geminiClient.js';

// Tool 1: search_documents
toolRegistry.register({
  name: 'search_documents',
  description: 'Search uploaded document metadata and extracted text. Returns document identifiers, metadata, and matching text snippets.',
  schema: z.object({
    query: z.string().optional().default(''),
    vendor: z.string().optional().default(''),
    documentType: z.string().optional().default('invoice'),
  }),
  execute: async (args) => {
    const results = await searchDocuments({
      query: args.query,
      vendor: args.vendor,
      documentType: args.documentType,
    });

    if (!results || results.length === 0) {
      return {
        count: 0,
        matches: [],
        message: `No documents found matching query: "${args.query || args.vendor || 'all'}".`,
      };
    }

    return {
      count: results.length,
      matches: results,
      message: `Found ${results.length} matching document(s).`,
    };
  },
});

// Tool 2: extract_invoice
toolRegistry.register({
  name: 'extract_invoice',
  description: 'Extract structured invoice details (vendor, invoice number, amount, currency, dates) from a selected document.',
  schema: z.object({
    documentId: z.string().min(1, 'documentId is required'),
  }),
  execute: async (args) => {
    const doc = await getDocumentFull(args.documentId);
    if (!doc) {
      throw new Error(`Document with ID "${args.documentId}" does not exist in the database.`);
    }

    if (!doc.extractedText || doc.extractionStatus === 'FAILED') {
      throw new Error(`Document "${doc.originalName}" has no extracted text or extraction failed: ${doc.extractionError || 'Unreadable'}.`);
    }

    // Extract structured data from document text using Gemini or deterministic extractor
    const extracted = await extractInvoiceDetailsFromText(doc.extractedText, doc.originalName);

    return {
      documentId: doc.documentId,
      filename: doc.originalName,
      vendor: extracted.vendor,
      invoiceNumber: extracted.invoiceNumber,
      amount: extracted.amount,
      currency: extracted.currency || 'USD',
      invoiceDate: extracted.invoiceDate,
      dueDate: extracted.dueDate,
      lineItems: extracted.lineItems || [],
      missingFields: extracted.missingFields || [],
      confidence: extracted.confidence || 0.95,
      sourceEvidence: extracted.sourceEvidence || 'Extracted directly from PDF text stream.',
    };
  },
});

// Tool 3: validate_invoice
toolRegistry.register({
  name: 'validate_invoice',
  description: 'Check extracted invoice fields for completeness, valid data types, positive monetary amounts, and valid date formats.',
  schema: z.object({
    vendor: z.string().min(1, 'Vendor name is required'),
    invoiceNumber: z.string().min(1, 'Invoice number is required'),
    amount: z.number().positive('Amount must be a positive number'),
    currency: z.string().min(1).default('USD'),
    invoiceDate: z.string().optional().nullable(),
    dueDate: z.string().optional().nullable(),
  }),
  execute: async (args) => {
    const issues = [];
    const normalizedVendor = args.vendor.trim();
    const normalizedInv = args.invoiceNumber.trim();

    if (normalizedVendor.length < 2) {
      issues.push('Vendor name is too short or invalid.');
    }
    if (normalizedInv.length < 1) {
      issues.push('Invoice number is missing or empty.');
    }
    if (args.amount <= 0 || isNaN(args.amount)) {
      issues.push('Invoice amount must be strictly greater than zero.');
    }

    const validCurrencies = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'INR', 'JPY', 'CHF'];
    const currUpper = (args.currency || 'USD').toUpperCase().trim();
    if (!validCurrencies.includes(currUpper)) {
      issues.push(`Currency "${args.currency}" is not supported or recognized.`);
    }

    if (args.dueDate) {
      const parsedDue = new Date(args.dueDate);
      if (isNaN(parsedDue.getTime())) {
        issues.push(`Due date "${args.dueDate}" is not a valid date format.`);
      }
    }

    if (args.invoiceDate) {
      const parsedInvDate = new Date(args.invoiceDate);
      if (isNaN(parsedInvDate.getTime())) {
        issues.push(`Invoice date "${args.invoiceDate}" is not a valid date format.`);
      }
    }

    const isValid = issues.length === 0;

    return {
      isValid,
      validatedData: {
        vendor: normalizedVendor,
        invoiceNumber: normalizedInv,
        amount: parseFloat(args.amount.toFixed(2)),
        currency: currUpper,
        invoiceDate: args.invoiceDate || null,
        dueDate: args.dueDate || null,
      },
      issues,
      status: isValid ? 'VALIDATION_PASSED' : 'VALIDATION_FAILED',
    };
  },
});

// Tool 4: create_finance_record
toolRegistry.register({
  name: 'create_finance_record',
  description: 'Create a permanent finance record in MongoDB with duplicate-key protection. Requires human approval if amount exceeds policy threshold.',
  schema: z.object({
    vendor: z.string().min(1),
    invoiceNumber: z.string().min(1),
    amount: z.number().positive(),
    currency: z.string().default('USD'),
    invoiceDate: z.string().optional().nullable(),
    dueDate: z.string().optional().nullable(),
    lineItems: z.array(z.any()).optional().default([]),
    documentId: z.string().optional().nullable(),
  }),
  execute: async (args, context = {}) => {
    const threshold = env.APPROVAL_THRESHOLD_AMOUNT;
    const task = context.task;

    // Check if amount exceeds enterprise threshold and human approval has not yet been granted
    if (args.amount >= threshold) {
      const isApproved = task && task.approvalState && task.approvalState.status === 'APPROVED';
      if (!isApproved) {
        // Human approval required!
        if (task) {
          const approvalReq = await createApprovalRequest({
            taskId: task.taskId,
            tool: 'create_finance_record',
            actionDescription: `Authorize creation of high-value finance record for ${args.vendor} (${args.currency} ${args.amount})`,
            reason: `Invoice amount of ${args.currency} ${args.amount} exceeds the enterprise automatic policy threshold of ${args.currency} ${threshold}.`,
            amount: args.amount,
            currency: args.currency,
            context: { args },
          });

          return {
            requiresApproval: true,
            approvalId: approvalReq.approvalId,
            message: `Amount ${args.currency} ${args.amount} exceeds enterprise threshold ${args.currency} ${threshold}. Execution paused awaiting human authorization.`,
          };
        }
      }
    }

    // Save record in database
    const record = await createFinanceRecord({
      vendor: args.vendor,
      invoiceNumber: args.invoiceNumber,
      amount: args.amount,
      currency: args.currency,
      invoiceDate: args.invoiceDate,
      dueDate: args.dueDate,
      lineItems: args.lineItems,
      documentId: args.documentId,
      taskId: task ? task.taskId : null,
    });

    return {
      recordId: record.recordId,
      vendor: record.vendor,
      invoiceNumber: record.invoiceNumber,
      amount: record.amount,
      currency: record.currency,
      status: record.status,
      uniqueCompositeKey: record.uniqueCompositeKey,
      createdAt: record.createdAt,
      message: `Finance record created successfully with ID: ${record.recordId}`,
    };
  },
});

// Tool 5: get_finance_record
toolRegistry.register({
  name: 'get_finance_record',
  description: 'Retrieve an existing finance record by recordId or normalized vendor and invoiceNumber.',
  schema: z.object({
    recordId: z.string().optional().nullable(),
    vendor: z.string().optional().nullable(),
    invoiceNumber: z.string().optional().nullable(),
  }),
  execute: async (args) => {
    let record = null;
    if (args.recordId) {
      record = await getFinanceRecordById(args.recordId);
    } else if (args.vendor && args.invoiceNumber) {
      record = await getFinanceRecordByBusinessKey(args.vendor, args.invoiceNumber);
    } else {
      throw new Error('Must provide either recordId or both vendor and invoiceNumber to retrieve a finance record.');
    }

    if (!record) {
      return {
        found: false,
        record: null,
        message: 'No matching finance record found in database.',
      };
    }

    return {
      found: true,
      record,
      message: `Retrieved record ${record.recordId} for vendor ${record.vendor}.`,
    };
  },
});

// Tool 6: verify_finance_record
toolRegistry.register({
  name: 'verify_finance_record',
  description: 'Perform independent verification comparing persisted database record with original source invoice data. Must pass before task completion.',
  schema: z.object({
    recordId: z.string().optional().nullable(),
    vendor: z.string().optional().nullable(),
    invoiceNumber: z.string().optional().nullable(),
    expectedSourceData: z.object({
      vendor: z.string(),
      invoiceNumber: z.string(),
      amount: z.number(),
      currency: z.string().optional().default('USD'),
      dueDate: z.string().optional().nullable(),
      invoiceDate: z.string().optional().nullable(),
    }),
  }),
  execute: async (args) => {
    const report = await verifyFinanceRecordAgainstSource({
      recordId: args.recordId,
      vendor: args.vendor,
      invoiceNumber: args.invoiceNumber,
      expectedSourceData: args.expectedSourceData,
    });

    return report;
  },
});

// Tool 7: request_human_approval
toolRegistry.register({
  name: 'request_human_approval',
  description: 'Explicitly request human authorization for sensitive or consequential operations.',
  schema: z.object({
    tool: z.string(),
    actionDescription: z.string(),
    reason: z.string(),
    amount: z.number().optional().nullable(),
    currency: z.string().optional().default('USD'),
  }),
  execute: async (args, context = {}) => {
    const task = context.task;
    if (!task) {
      throw new Error('Cannot request human approval without an active task context.');
    }

    const req = await createApprovalRequest({
      taskId: task.taskId,
      tool: args.tool,
      actionDescription: args.actionDescription,
      reason: args.reason,
      amount: args.amount,
      currency: args.currency,
      context: { manualRequest: true },
    });

    return {
      approvalId: req.approvalId,
      status: 'PENDING',
      message: `Human approval request ${req.approvalId} created and task execution paused.`,
    };
  },
});

export { toolRegistry };
