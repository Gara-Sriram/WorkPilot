import fs from 'fs/promises';
import { extractText } from 'unpdf';

export async function extractTextFromPdf(filePathOrBuffer) {
  try {
    let uint8Array;
    if (typeof filePathOrBuffer === 'string') {
      const buffer = await fs.readFile(filePathOrBuffer);
      uint8Array = new Uint8Array(buffer);
    } else if (Buffer.isBuffer(filePathOrBuffer)) {
      uint8Array = new Uint8Array(filePathOrBuffer);
    } else if (filePathOrBuffer instanceof Uint8Array) {
      uint8Array = filePathOrBuffer;
    } else {
      throw new Error('Invalid input: expected file path, Buffer, or Uint8Array');
    }

    if (!uint8Array || uint8Array.length === 0) {
      throw new Error('PDF file is empty (0 bytes).');
    }

    // Verify PDF magic header "%PDF-"
    const magicHeader = Buffer.from(uint8Array.slice(0, 5)).toString('ascii');
    if (magicHeader !== '%PDF-') {
      throw new Error('Invalid file format: Not a valid PDF document (missing %PDF- header).');
    }

    const { text: pagesText, totalPages } = await extractText(uint8Array);

    let text = '';
    if (Array.isArray(pagesText)) {
      text = pagesText.join('\n').trim();
    } else if (typeof pagesText === 'string') {
      text = pagesText.trim();
    }

    if (!text) {
      return {
        success: false,
        text: '',
        pageCount: totalPages || 0,
        error: 'PDF contains no readable text content (may be scanned image or empty).',
      };
    }

    // Heuristically detect basic keywords to assist search indexing
    const vendorGuess = extractVendorHeuristic(text);
    const invoiceNumberGuess = extractInvoiceNumberHeuristic(text);

    return {
      success: true,
      text,
      pageCount: totalPages || 1,
      vendorGuess,
      invoiceNumberGuess,
    };
  } catch (err) {
    return {
      success: false,
      text: '',
      pageCount: 0,
      error: `PDF extraction failed: ${err.message}`,
    };
  }
}

function extractVendorHeuristic(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length > 0) {
    for (let i = 0; i < Math.min(6, lines.length); i++) {
      if (/(technologies|corp|inc|llc|logistics|consulting|solutions|systems|services)/i.test(lines[i])) {
        return lines[i].replace(/invoice/gi, '').trim();
      }
    }
    return lines[0].slice(0, 50);
  }
  return '';
}

function extractInvoiceNumberHeuristic(text) {
  const match = text.match(/(?:invoice|inv)[\s#:]+([A-Za-z0-9-_]+)/i);
  return match ? match[1].trim() : '';
}
