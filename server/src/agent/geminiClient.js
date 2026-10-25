import { GoogleGenAI } from '@google/genai';
import { env } from '../config/env.js';

let aiInstance = null;

function getAIClient() {
  if (env.isLiveAI && !aiInstance) {
    try {
      aiInstance = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
    } catch (err) {
      console.warn(`[Gemini SDK] Could not initialize GoogleGenAI client: ${err.message}. Using deterministic fallback.`);
    }
  }
  return aiInstance;
}

function withTimeout(promise, ms = 7000) {
  let timer;
  const timeoutPromise = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`API request timed out after ${ms / 1000}s`)), ms);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timer));
}

/**
 * Interpret user goal into structured intent
 */
export async function interpretTask(userRequest, context = {}) {
  const client = getAIClient();

  if (client && env.isLiveAI) {
    try {
      const prompt = `You are WorkPilot AI, an autonomous enterprise AI employee.
Analyze the following user instruction and return a valid JSON object strictly matching this schema:
{
  "goal": "string (succinct summary of the user objective)",
  "requestedActions": ["list of specific enterprise actions required"],
  "searchCriteria": {
    "query": "string (keywords to search for relevant invoices or documents)",
    "vendor": "string (detected vendor name or empty)"
  },
  "proposedTools": ["list of tools proposed, e.g. search_documents, extract_invoice, validate_invoice, create_finance_record, verify_finance_record"],
  "isSensitive": boolean (true if action involves high amounts or financial commits),
  "completionCriteria": "string (what verified condition signals true completion)"
}

User instruction: "${userRequest}"`;

      const response = await withTimeout(
        client.models.generateContent({
          model: env.GEMINI_MODEL,
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            temperature: 0.1,
          },
        }),
        7000
      );

      const responseText = response.text ? response.text.trim() : '';
      const parsed = JSON.parse(responseText);
      return {
        ...parsed,
        source: 'LIVE_GEMINI',
        model: env.GEMINI_MODEL,
      };
    } catch (err) {
      console.warn(`[Gemini API] Error during live interpretation (${err.message}). Using deterministic fallback.`);
    }
  }

  // High-fidelity deterministic fallback engine
  return deterministicTaskInterpreter(userRequest, context);
}

/**
 * Generate an initial structured execution plan based on interpreted task
 */
export async function generateExecutionPlan(taskInterpretation, availableTools) {
  const client = getAIClient();

  if (client && env.isLiveAI) {
    try {
      const prompt = `You are WorkPilot AI execution planner.
Given this interpreted goal:
${JSON.stringify(taskInterpretation, null, 2)}

And these available tools:
${JSON.stringify(availableTools, null, 2)}

Create an ordered list of executable steps. Output strict JSON array of objects with schema:
[
  {
    "stepId": "step_1",
    "description": "Human-readable description of what this step does",
    "tool": "name_of_tool",
    "args": { "argumentKey": "value" }
  }
]
Rules:
- Mark tasks completed ONLY after independent verification (verify_finance_record).
- Keep plan focused and within 10 steps maximum.`;

      const response = await withTimeout(
        client.models.generateContent({
          model: env.GEMINI_MODEL,
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            temperature: 0.1,
          },
        }),
        7000
      );

      const planArray = JSON.parse(response.text.trim());
      if (Array.isArray(planArray) && planArray.length > 0) {
        return planArray.map((s, idx) => ({
          stepId: s.stepId || `step_${idx + 1}`,
          description: s.description || `Execute ${s.tool}`,
          tool: s.tool,
          args: s.args || {},
          status: 'PENDING',
          attempts: 0,
        }));
      }
    } catch (err) {
      console.warn(`[Gemini API] Error generating plan via live AI (${err.message}). Using deterministic planner.`);
    }
  }

  return deterministicPlanGenerator(taskInterpretation);
}

/**
 * Extract structured invoice data from document text stream
 */
export async function extractInvoiceDetailsFromText(rawText, filename = '') {
  const client = getAIClient();

  if (client && env.isLiveAI) {
    try {
      const prompt = `Extract invoice details from the following invoice text.
Output strict JSON with this schema:
{
  "vendor": "string (official vendor/company name)",
  "invoiceNumber": "string (invoice/bill reference number)",
  "amount": number (total amount due, positive float),
  "currency": "string (e.g. USD, EUR, GBP)",
  "invoiceDate": "YYYY-MM-DD or null",
  "dueDate": "YYYY-MM-DD or null",
  "lineItems": [
    { "description": "item name", "quantity": number, "unitPrice": number, "total": number }
  ],
  "missingFields": ["list of any required fields that were missing or ambiguous"],
  "confidence": number (between 0.0 and 1.0),
  "sourceEvidence": "brief quotation or evidence from text"
}

Invoice text:
"""
${rawText.slice(0, 4000)}
"""`;

      const response = await withTimeout(
        client.models.generateContent({
          model: env.GEMINI_MODEL,
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            temperature: 0.1,
          },
        }),
        7000
      );

      const parsed = JSON.parse(response.text.trim());
      if (parsed.vendor && parsed.invoiceNumber && parsed.amount) {
        return parsed;
      }
    } catch (err) {
      console.warn(`[Gemini API] Error during live invoice extraction (${err.message}). Using deterministic extractor.`);
    }
  }

  return deterministicInvoiceExtractor(rawText, filename);
}

// ==========================================
// Deterministic Fallback Engines (High Fidelity)
// ==========================================

function deterministicTaskInterpreter(userRequest, context) {
  const lower = userRequest.toLowerCase();

  // Detect vendor keyword
  let detectedVendor = '';
  if (lower.includes('acme')) detectedVendor = 'Acme Technologies';
  else if (lower.includes('globex')) detectedVendor = 'Globex Logistics';
  else if (lower.includes('initech')) detectedVendor = 'Initech Consulting';
  else {
    const vendorMatch = userRequest.match(/(?:for|from|vendor)\s+([A-Za-z0-9_-]+)/i);
    if (vendorMatch) {
      detectedVendor = vendorMatch[1].trim();
    }
  }

  // Detect invoice number code (e.g. INV-2024-001, GLX-9942, INT-7701)
  const invCodeMatch = userRequest.match(/\b([A-Za-z]{2,5}-\d{3,6}(?:-[A-Za-z0-9]+)?)\b/);
  const detectedInv = invCodeMatch ? invCodeMatch[1] : '';

  const isSensitive = lower.includes('globex') || lower.includes('15000') || lower.includes('urgent') || lower.includes('payment');

  return {
    goal: `Process invoice workflow: verify and record invoice details for ${detectedVendor || 'specified document'}.`,
    requestedActions: [
      'Locate relevant invoice document',
      'Extract invoice metadata and line items',
      'Validate financial fields',
      'Create persistent finance record',
      'Perform independent verification against original source',
    ],
    searchCriteria: {
      query: detectedInv || detectedVendor || 'invoice',
      vendor: detectedVendor,
    },
    proposedTools: [
      'search_documents',
      'extract_invoice',
      'validate_invoice',
      'create_finance_record',
      'verify_finance_record',
    ],
    isSensitive,
    completionCriteria: 'Finance record successfully created and verified against source document with zero discrepancies.',
    source: 'DETERMINISTIC_FIXTURE_ENGINE',
  };
}

function deterministicPlanGenerator(taskInterpretation) {
  const query = taskInterpretation.searchCriteria?.query || '';
  const vendor = taskInterpretation.searchCriteria?.vendor || '';

  return [
    {
      stepId: 'step_1',
      description: `Search uploaded documents for matching invoice (${vendor || query || 'latest'})`,
      tool: 'search_documents',
      args: { query, vendor },
      status: 'PENDING',
      attempts: 0,
    },
    {
      stepId: 'step_2',
      description: 'Extract structured invoice details from matched document',
      tool: 'extract_invoice',
      args: {}, // dynamically filled at runtime from step_1 result
      status: 'PENDING',
      attempts: 0,
    },
    {
      stepId: 'step_3',
      description: 'Validate extracted invoice data types, positive amount, and dates',
      tool: 'validate_invoice',
      args: {}, // dynamically filled at runtime from step_2
      status: 'PENDING',
      attempts: 0,
    },
    {
      stepId: 'step_4',
      description: 'Create persistent finance record with duplicate-prevention constraints',
      tool: 'create_finance_record',
      args: {}, // dynamically filled at runtime from step_3
      status: 'PENDING',
      attempts: 0,
    },
    {
      stepId: 'step_5',
      description: 'Perform independent verification comparing persisted DB record against original invoice data',
      tool: 'verify_finance_record',
      args: {}, // dynamically filled at runtime from step_4 & step_2
      status: 'PENDING',
      attempts: 0,
    },
  ];
}

function deterministicInvoiceExtractor(text, filename) {
  const missingFields = [];
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  // Vendor detection
  let vendor = '';
  if (/acme technologies/i.test(text)) vendor = 'Acme Technologies Inc.';
  else if (/globex logistics/i.test(text)) vendor = 'Globex Logistics Corp.';
  else if (/initech consulting/i.test(text)) vendor = 'Initech Consulting LLC';
  else {
    for (const line of lines) {
      if (/(technologies|corp|inc|llc|logistics|consulting|solutions|systems|services)/i.test(line)) {
        vendor = line.replace(/invoice/gi, '').trim();
        break;
      }
    }
  }
  if (!vendor && lines.length > 0) vendor = lines[0].slice(0, 40);
  if (!vendor) missingFields.push('vendor');

  // Invoice Number
  let invoiceNumber = '';
  const invMatch = text.match(/(?:invoice|inv)[\s#:]+([A-Za-z0-9-_]+)/i);
  if (invMatch) invoiceNumber = invMatch[1].trim();
  else missingFields.push('invoiceNumber');

  // Amount
  let amount = 0;
  const totalMatch = text.match(/(?:total amount|total due|amount due|balance due|total)[\s:A-Za-z$€£]*([\d,]+\.?\d+)/i);
  if (totalMatch) {
    amount = parseFloat(totalMatch[1].replace(/,/g, ''));
  } else {
    // Search for currency amount
    const amtMatch = text.match(/(?:USD|EUR|GBP|\$)\s*([\d,]+\.?\d+)/i);
    if (amtMatch) amount = parseFloat(amtMatch[1].replace(/,/g, ''));
  }
  if (!amount || amount <= 0) missingFields.push('amount');

  // Currency
  let currency = 'USD';
  if (/€|eur/i.test(text)) currency = 'EUR';
  else if (/£|gbp/i.test(text)) currency = 'GBP';

  // Dates
  let invoiceDate = null;
  const invDateMatch = text.match(/(?:invoice date|date)[\s:]+(\d{4}-\d{2}-\d{2}|\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})/i);
  if (invDateMatch) {
    try {
      invoiceDate = new Date(invDateMatch[1]).toISOString().slice(0, 10);
    } catch {
      invoiceDate = null;
    }
  }

  let dueDate = null;
  const dueDateMatch = text.match(/(?:due date|payment due)[\s:]+(\d{4}-\d{2}-\d{2}|\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})/i);
  if (dueDateMatch) {
    try {
      dueDate = new Date(dueDateMatch[1]).toISOString().slice(0, 10);
    } catch {
      dueDate = null;
    }
  }

  return {
    vendor: vendor || 'Unknown Vendor',
    invoiceNumber: invoiceNumber || 'INV-UNKNOWN',
    amount: amount || 0,
    currency,
    invoiceDate,
    dueDate,
    lineItems: [
      {
        description: 'Standard enterprise services',
        quantity: 1,
        unitPrice: amount,
        total: amount,
      },
    ],
    missingFields,
    confidence: missingFields.length === 0 ? 0.98 : 0.65,
    sourceEvidence: `Extracted from text: "${text.slice(0, 150).replace(/\s+/g, ' ')}..."`,
  };
}
