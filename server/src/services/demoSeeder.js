import { generateSamplePdfs } from '../fixtures/generatePdfFixtures.js';
import { saveUploadedDocument } from './documentService.js';
import { DocumentModel } from '../models/Document.js';
import { Task } from '../models/Task.js';
import { FinanceRecord } from '../models/FinanceRecord.js';
import { ApprovalRequest } from '../models/ApprovalRequest.js';

export async function seedDemoData({ reset = false } = {}) {
  if (reset) {
    console.log('[Demo Seeder] Resetting demo documents, tasks, and finance records...');
    await Promise.all([
      DocumentModel.deleteMany({ isSample: true }),
      Task.deleteMany({}),
      FinanceRecord.deleteMany({}),
      ApprovalRequest.deleteMany({}),
    ]);
  }

  // Check if sample documents are already seeded
  const existingCount = await DocumentModel.countDocuments({ isSample: true });
  if (existingCount >= 3) {
    return {
      message: 'Demo documents are already seeded.',
      seededCount: existingCount,
    };
  }

  console.log('[Demo Seeder] Generating real PDF invoices for demo environment...');
  const samplePdfs = await generateSamplePdfs();
  const createdDocs = [];

  for (const item of samplePdfs) {
    // Check if document with same name already exists
    const exists = await DocumentModel.findOne({ originalName: item.filename });
    if (!exists) {
      const doc = await saveUploadedDocument({
        originalName: item.filename,
        buffer: item.buffer,
        mimeType: 'application/pdf',
        size: item.buffer.length,
        isSample: true,
      });
      createdDocs.push(doc);
    }
  }

  console.log(`[Demo Seeder] Successfully seeded ${createdDocs.length} demo PDF document(s).`);

  return {
    message: `Successfully seeded ${createdDocs.length} demo document(s).`,
    documents: createdDocs.map(d => ({
      documentId: d.documentId,
      name: d.originalName,
      vendor: d.vendorGuess,
      invoiceNumber: d.invoiceNumberGuess,
    })),
  };
}
