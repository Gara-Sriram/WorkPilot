import express from 'express';
import { uploadMiddleware } from '../middleware/upload.js';
import {
  saveUploadedDocument,
  searchDocuments,
  getDocumentById,
  listAllDocuments,
} from '../services/documentService.js';
import { rateLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// Upload a document
router.post('/documents', rateLimiter({ max: 20 }), uploadMiddleware.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded. Please select a valid PDF file.' });
    }

    const doc = await saveUploadedDocument({
      originalName: req.file.originalname,
      buffer: req.file.buffer,
      mimeType: req.file.mimetype,
      size: req.file.size,
      isSample: false,
    });

    res.status(201).json({
      success: true,
      document: doc,
    });
  } catch (err) {
    next(err);
  }
});

// Search documents
router.get('/documents/search', async (req, res, next) => {
  try {
    const { query = '', vendor = '', limit = 10 } = req.query;
    const matches = await searchDocuments({
      query,
      vendor,
      limit: parseInt(limit, 10),
    });

    res.json({
      success: true,
      count: matches.length,
      matches,
    });
  } catch (err) {
    next(err);
  }
});

// List all documents
router.get('/documents', async (req, res, next) => {
  try {
    const { limit = 50, skip = 0 } = req.query;
    const result = await listAllDocuments({
      limit: parseInt(limit, 10),
      skip: parseInt(skip, 10),
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
});

// Get document metadata
router.get('/documents/:documentId', async (req, res, next) => {
  try {
    const doc = await getDocumentById(req.params.documentId);
    if (!doc) {
      return res.status(404).json({ error: `Document "${req.params.documentId}" not found.` });
    }

    res.json(doc);
  } catch (err) {
    next(err);
  }
});

// Get extracted document text
router.get('/documents/:documentId/text', async (req, res, next) => {
  try {
    const doc = await getDocumentById(req.params.documentId);
    if (!doc) {
      return res.status(404).json({ error: `Document "${req.params.documentId}" not found.` });
    }

    res.json({
      documentId: doc.documentId,
      originalName: doc.originalName,
      extractionStatus: doc.extractionStatus,
      extractionError: doc.extractionError,
      text: doc.extractedText || '',
    });
  } catch (err) {
    next(err);
  }
});

export default router;
