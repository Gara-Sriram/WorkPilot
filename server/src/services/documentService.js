import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { DocumentModel } from '../models/Document.js';
import { extractTextFromPdf } from './pdfService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOADS_DIR = path.resolve(__dirname, '../../uploads');

// Ensure uploads directory exists
await fs.mkdir(UPLOADS_DIR, { recursive: true });

export async function saveUploadedDocument({ originalName, buffer, mimeType, size, isSample = false }) {
  const documentId = `doc_${crypto.randomBytes(6).toString('hex')}`;
  const safeFilename = `${documentId}_${originalName.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
  const storagePath = path.join(UPLOADS_DIR, safeFilename);

  // Write file to disk
  await fs.writeFile(storagePath, buffer);

  // Extract text from the saved PDF
  const extraction = await extractTextFromPdf(buffer);

  const doc = await DocumentModel.create({
    documentId,
    originalName,
    mimeType: mimeType || 'application/pdf',
    size,
    storagePath,
    extractedText: extraction.text || '',
    extractionStatus: extraction.success ? 'SUCCESS' : 'FAILED',
    extractionError: extraction.error || null,
    vendorGuess: extraction.vendorGuess || '',
    invoiceNumberGuess: extraction.invoiceNumberGuess || '',
    isSample,
  });

  return doc;
}

export async function searchDocuments({ query, vendor, documentType, limit = 10 }) {
  const filter = {};

  const searchTerms = [];
  if (query && query.trim()) {
    searchTerms.push(query.trim());
  }
  if (vendor && vendor.trim()) {
    searchTerms.push(vendor.trim());
  }

  let docs = [];

  if (searchTerms.length > 0) {
    const regexPattern = searchTerms.map(t => escapeRegExp(t)).join('|');
    const searchRegex = new RegExp(regexPattern, 'i');

    filter.$or = [
      { originalName: searchRegex },
      { vendorGuess: searchRegex },
      { invoiceNumberGuess: searchRegex },
      { extractedText: searchRegex },
    ];
    docs = await DocumentModel.find(filter).sort({ createdAt: -1 }).limit(limit * 2).lean();

    // Sort docs by match relevance: documents matching vendor or query terms highest
    docs.sort((a, b) => {
      const aText = (a.originalName + ' ' + (a.vendorGuess || '') + ' ' + (a.extractedText || '')).toLowerCase();
      const bText = (b.originalName + ' ' + (b.vendorGuess || '') + ' ' + (b.extractedText || '')).toLowerCase();
      let scoreA = 0;
      let scoreB = 0;

      if (vendor && vendor.trim()) {
        const vLower = vendor.toLowerCase().trim();
        if ((a.vendorGuess || '').toLowerCase().includes(vLower)) scoreA += 20;
        if (a.originalName.toLowerCase().includes(vLower)) scoreA += 15;
        if (aText.includes(vLower)) scoreA += 10;

        if ((b.vendorGuess || '').toLowerCase().includes(vLower)) scoreB += 20;
        if (b.originalName.toLowerCase().includes(vLower)) scoreB += 15;
        if (bText.includes(vLower)) scoreB += 10;
      }

      if (query && query.trim() && query.toLowerCase() !== 'invoice') {
        const qLower = query.toLowerCase().trim();
        if (a.originalName.toLowerCase().includes(qLower)) scoreA += 15;
        if (aText.includes(qLower)) scoreA += 5;
        if (b.originalName.toLowerCase().includes(qLower)) scoreB += 15;
        if (bText.includes(qLower)) scoreB += 5;
      }

      return scoreB - scoreA;
    });

    if (docs.length > limit) {
      docs = docs.slice(0, limit);
    }
  } else {
    docs = await DocumentModel.find().sort({ createdAt: -1 }).limit(limit).lean();
  }

  // Generate relevant text snippets highlighting the matched query terms
  return docs.map(doc => {
    let snippet = '';
    if (doc.extractedText) {
      if (query && query.trim()) {
        const idx = doc.extractedText.toLowerCase().indexOf(query.toLowerCase());
        if (idx !== -1) {
          const start = Math.max(0, idx - 60);
          const end = Math.min(doc.extractedText.length, idx + 140);
          snippet = (start > 0 ? '...' : '') + doc.extractedText.substring(start, end).replace(/\s+/g, ' ') + (end < doc.extractedText.length ? '...' : '');
        }
      }
      if (!snippet) {
        snippet = doc.extractedText.substring(0, 180).replace(/\s+/g, ' ') + '...';
      }
    }

    return {
      documentId: doc.documentId,
      originalName: doc.originalName,
      size: doc.size,
      extractionStatus: doc.extractionStatus,
      vendorGuess: doc.vendorGuess,
      invoiceNumberGuess: doc.invoiceNumberGuess,
      snippet,
      createdAt: doc.createdAt,
    };
  });
}

export async function getDocumentById(documentId) {
  return DocumentModel.findOne({ documentId }).lean();
}

export async function getDocumentFull(documentId) {
  return DocumentModel.findOne({ documentId });
}

export async function listAllDocuments({ limit = 50, skip = 0 } = {}) {
  const [documents, total] = await Promise.all([
    DocumentModel.find()
      .select('-extractedText') // Omit large text in list view for performance
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    DocumentModel.countDocuments(),
  ]);

  return { documents, total };
}

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
