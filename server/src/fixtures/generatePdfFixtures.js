import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FIXTURES_DIR = path.resolve(__dirname, '../../fixtures');

export async function generateSamplePdfs() {
  await fs.mkdir(FIXTURES_DIR, { recursive: true });

  const samples = [
    {
      filename: 'Acme_Technologies_Invoice_INV-2024-001.pdf',
      vendor: 'Acme Technologies Inc.',
      address: '100 Silicon Way, Tech Park, CA 94025',
      invoiceNumber: 'INV-2024-001',
      invoiceDate: '2024-10-15',
      dueDate: '2024-11-15',
      amount: '2450.00',
      currency: 'USD',
      items: [
        { desc: 'Managed Kubernetes Cloud Hosting Cluster', qty: '1', price: '$1,850.00', total: '$1,850.00' },
        { desc: 'Database Automated Backups & Maintenance', qty: '1', price: '$600.00', total: '$600.00' },
      ],
      note: 'Payment due within 30 days. Remit to payments@acme-tech.example.com',
    },
    {
      filename: 'Globex_Logistics_Invoice_GLX-9942.pdf',
      vendor: 'Globex Logistics Corp.',
      address: '742 Evergreen Terrace, Sector 4, NY 10001',
      invoiceNumber: 'GLX-9942',
      invoiceDate: '2024-10-20',
      dueDate: '2024-11-20',
      amount: '14800.00',
      currency: 'USD',
      items: [
        { desc: 'Global Freight Air Shipping & Freight Forwarding', qty: '2', price: '$6,400.00', total: '$12,800.00' },
        { desc: 'Customs Clearance & Hazardous Material Handling', qty: '1', price: '$2,000.00', total: '$2,000.00' },
      ],
      note: 'HIGH-VALUE INVOICE: Subject to executive governance and corporate sign-off policies.',
    },
    {
      filename: 'Initech_Consulting_Invoice_INT-7701.pdf',
      vendor: 'Initech Consulting LLC',
      address: '4120 Freemont Blvd, Suite 200, Austin, TX 78701',
      invoiceNumber: 'INT-7701',
      invoiceDate: '2024-10-10',
      dueDate: '2024-11-10',
      amount: '4200.00',
      currency: 'USD',
      items: [
        { desc: 'Enterprise Workflow Systems Architecture Advisory', qty: '14', price: '$300.00', total: '$4,200.00' },
      ],
      note: 'Thank you for your business. Remit electronic funds transfer to Initech Corp.',
    },
  ];

  const generatedFiles = [];

  for (const s of samples) {
    const doc = await PDFDocument.create();
    const page = doc.addPage([600, 750]);
    const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
    const fontRegular = await doc.embedFont(StandardFonts.Helvetica);

    // Header / Title
    page.drawText(s.vendor.toUpperCase(), { x: 50, y: 700, size: 20, font: fontBold, color: rgb(0.08, 0.12, 0.2) });
    page.drawText(s.address, { x: 50, y: 680, size: 9, font: fontRegular, color: rgb(0.4, 0.45, 0.5) });

    page.drawText('INVOICE', { x: 450, y: 700, size: 24, font: fontBold, color: rgb(0.1, 0.6, 0.4) });
    page.drawText(`Invoice #: ${s.invoiceNumber}`, { x: 420, y: 675, size: 10, font: fontBold, color: rgb(0.2, 0.2, 0.2) });
    page.drawText(`Date: ${s.invoiceDate}`, { x: 420, y: 660, size: 10, font: fontRegular, color: rgb(0.3, 0.3, 0.3) });
    page.drawText(`Due Date: ${s.dueDate}`, { x: 420, y: 645, size: 10, font: fontBold, color: rgb(0.8, 0.2, 0.2) });

    // Horizontal Rule
    page.drawLine({ start: { x: 50, y: 620 }, end: { x: 550, y: 620 }, thickness: 1, color: rgb(0.85, 0.88, 0.9) });

    // Table Header
    page.drawText('Description', { x: 50, y: 595, size: 11, font: fontBold, color: rgb(0.1, 0.15, 0.25) });
    page.drawText('Qty', { x: 340, y: 595, size: 11, font: fontBold, color: rgb(0.1, 0.15, 0.25) });
    page.drawText('Unit Price', { x: 400, y: 595, size: 11, font: fontBold, color: rgb(0.1, 0.15, 0.25) });
    page.drawText('Total', { x: 490, y: 595, size: 11, font: fontBold, color: rgb(0.1, 0.15, 0.25) });

    page.drawLine({ start: { x: 50, y: 585 }, end: { x: 550, y: 585 }, thickness: 0.5, color: rgb(0.7, 0.75, 0.8) });

    let currentY = 560;
    for (const item of s.items) {
      page.drawText(item.desc, { x: 50, y: currentY, size: 10, font: fontRegular, color: rgb(0.2, 0.25, 0.3) });
      page.drawText(item.qty, { x: 345, y: currentY, size: 10, font: fontRegular, color: rgb(0.2, 0.25, 0.3) });
      page.drawText(item.price, { x: 400, y: currentY, size: 10, font: fontRegular, color: rgb(0.2, 0.25, 0.3) });
      page.drawText(item.total, { x: 490, y: currentY, size: 10, font: fontRegular, color: rgb(0.2, 0.25, 0.3) });
      currentY -= 28;
    }

    page.drawLine({ start: { x: 50, y: currentY + 10 }, end: { x: 550, y: currentY + 10 }, thickness: 1, color: rgb(0.85, 0.88, 0.9) });

    // Total Amount Box
    page.drawText(`TOTAL AMOUNT: ${s.currency} ${s.amount}`, { x: 340, y: currentY - 20, size: 12, font: fontBold, color: rgb(0.05, 0.55, 0.35) });

    // Footer & note
    page.drawText('Notes & Instructions:', { x: 50, y: currentY - 80, size: 10, font: fontBold, color: rgb(0.3, 0.3, 0.3) });
    page.drawText(s.note, { x: 50, y: currentY - 95, size: 9, font: fontRegular, color: rgb(0.45, 0.5, 0.55) });

    const pdfBytes = await doc.save({ useObjectStreams: false });
    const filePath = path.join(FIXTURES_DIR, s.filename);
    await fs.writeFile(filePath, pdfBytes);
    generatedFiles.push({ filename: s.filename, filePath, metadata: s, buffer: Buffer.from(pdfBytes) });
  }

  return generatedFiles;
}
