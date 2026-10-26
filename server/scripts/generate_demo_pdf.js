import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const OUTPUT_PDF_PATH = path.resolve(__dirname, '../../WorkPilot_Demo_Video_Script_And_Guide.pdf');

class PdfHelper {
  constructor(doc, fontRegular, fontBold, fontMono) {
    this.doc = doc;
    this.fontRegular = fontRegular;
    this.fontBold = fontBold;
    this.fontMono = fontMono;
    this.pageWidth = 595.28; // A4 standard
    this.pageHeight = 841.89;
    this.margin = 45;
    this.contentWidth = this.pageWidth - (this.margin * 2);
    this.currentPage = null;
    this.currentY = 0;
    this.pageNumber = 0;
    this.addNewPage();
  }

  addNewPage() {
    this.currentPage = this.doc.addPage([this.pageWidth, this.pageHeight]);
    this.pageNumber += 1;
    this.currentY = this.pageHeight - this.margin;

    // Header banner on pages after page 1
    if (this.pageNumber > 1) {
      this.currentPage.drawText('WorkPilot — Demo Video Walkthrough & Script | Gara Sriram (IIIT Allahabad)', {
        x: this.margin,
        y: this.pageHeight - 28,
        size: 8,
        font: this.fontRegular,
        color: rgb(0.45, 0.5, 0.55),
      });
      this.currentPage.drawLine({
        start: { x: this.margin, y: this.pageHeight - 34 },
        end: { x: this.pageWidth - this.margin, y: this.pageHeight - 34 },
        thickness: 0.5,
        color: rgb(0.85, 0.88, 0.9),
      });
      this.currentY = this.pageHeight - 50;
    }

    // Footer on all pages
    this.currentPage.drawLine({
      start: { x: this.margin, y: 35 },
      end: { x: this.pageWidth - this.margin, y: 35 },
      thickness: 0.5,
      color: rgb(0.85, 0.88, 0.9),
    });
    this.currentPage.drawText(`Page ${this.pageNumber} — Live Demo: https://workpilot-hnvp.onrender.com`, {
      x: this.margin,
      y: 22,
      size: 8,
      font: this.fontRegular,
      color: rgb(0.5, 0.55, 0.6),
    });
  }

  ensureSpace(requiredHeight) {
    if (this.currentY - requiredHeight < 55) {
      this.addNewPage();
    }
  }

  addTitle(title, subtitle) {
    this.ensureSpace(60);
    // Dark green banner background
    this.currentPage.drawRectangle({
      x: this.margin,
      y: this.currentY - 38,
      width: this.contentWidth,
      height: 44,
      color: rgb(0.04, 0.5, 0.35),
    });

    this.currentPage.drawText(title, {
      x: this.margin + 12,
      y: this.currentY - 18,
      size: 15,
      font: this.fontBold,
      color: rgb(1, 1, 1),
    });

    this.currentPage.drawText(subtitle, {
      x: this.margin + 12,
      y: this.currentY - 32,
      size: 9,
      font: this.fontRegular,
      color: rgb(0.85, 0.98, 0.92),
    });

    this.currentY -= 52;
  }

  addSectionHeading(text) {
    this.ensureSpace(35);
    this.currentY -= 6;
    this.currentPage.drawText(text, {
      x: this.margin,
      y: this.currentY,
      size: 12,
      font: this.fontBold,
      color: rgb(0.08, 0.15, 0.28),
    });

    this.currentPage.drawLine({
      start: { x: this.margin, y: this.currentY - 4 },
      end: { x: this.margin + 200, y: this.currentY - 4 },
      thickness: 1.5,
      color: rgb(0.04, 0.6, 0.4),
    });

    this.currentY -= 16;
  }

  addSubheading(text) {
    this.ensureSpace(22);
    this.currentPage.drawText(text, {
      x: this.margin,
      y: this.currentY,
      size: 10,
      font: this.fontBold,
      color: rgb(0.12, 0.25, 0.45),
    });
    this.currentY -= 13;
  }

  addParagraph(text, isQuote = false) {
    const fontSize = isQuote ? 8.5 : 9;
    const font = this.fontRegular;
    const color = isQuote ? rgb(0.15, 0.2, 0.25) : rgb(0.2, 0.25, 0.3);
    const lineHeight = 12;

    const words = text.split(' ');
    let currentLine = '';
    const lines = [];

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const width = font.widthOfTextAtSize(testLine, fontSize);
      if (width > (this.contentWidth - (isQuote ? 20 : 0))) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) lines.push(currentLine);

    this.ensureSpace((lines.length * lineHeight) + 8);

    if (isQuote) {
      const boxHeight = (lines.length * lineHeight) + 6;
      this.currentPage.drawRectangle({
        x: this.margin,
        y: this.currentY - boxHeight + 4,
        width: this.contentWidth,
        height: boxHeight,
        color: rgb(0.95, 0.97, 0.99),
        borderColor: rgb(0.8, 0.86, 0.92),
        borderWidth: 0.5,
      });
      this.currentPage.drawRectangle({
        x: this.margin,
        y: this.currentY - boxHeight + 4,
        width: 3,
        height: boxHeight,
        color: rgb(0.15, 0.45, 0.8),
      });
    }

    const startX = isQuote ? this.margin + 12 : this.margin;
    for (const line of lines) {
      this.currentPage.drawText(line, {
        x: startX,
        y: this.currentY,
        size: fontSize,
        font,
        color,
      });
      this.currentY -= lineHeight;
    }
    this.currentY -= 4;
  }

  addBullet(boldPrefix, text) {
    const fontSize = 8.5;
    const lineHeight = 11.5;
    const prefixWidth = this.fontBold.widthOfTextAtSize(boldPrefix + ' ', fontSize);

    const words = text.split(' ');
    let currentLine = '';
    const lines = [];

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const width = this.fontRegular.widthOfTextAtSize(testLine, fontSize);
      const maxWidth = lines.length === 0
        ? this.contentWidth - 18 - prefixWidth
        : this.contentWidth - 18;

      if (width > maxWidth) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) lines.push(currentLine);

    this.ensureSpace((lines.length * lineHeight) + 5);

    this.currentPage.drawText('•', {
      x: this.margin + 6,
      y: this.currentY,
      size: 10,
      font: this.fontBold,
      color: rgb(0.04, 0.55, 0.35),
    });

    this.currentPage.drawText(boldPrefix + ' ', {
      x: this.margin + 18,
      y: this.currentY,
      size: fontSize,
      font: this.fontBold,
      color: rgb(0.1, 0.15, 0.25),
    });

    if (lines.length > 0) {
      this.currentPage.drawText(lines[0], {
        x: this.margin + 18 + prefixWidth,
        y: this.currentY,
        size: fontSize,
        font: this.fontRegular,
        color: rgb(0.25, 0.3, 0.35),
      });
      this.currentY -= lineHeight;

      for (let i = 1; i < lines.length; i++) {
        this.currentPage.drawText(lines[i], {
          x: this.margin + 18,
          y: this.currentY,
          size: fontSize,
          font: this.fontRegular,
          color: rgb(0.25, 0.3, 0.35),
        });
        this.currentY -= lineHeight;
      }
    } else {
      this.currentY -= lineHeight;
    }
    this.currentY -= 2;
  }
}

async function buildPdf() {
  const doc = await PDFDocument.create();
  const fontRegular = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const fontMono = await doc.embedFont(StandardFonts.Courier);

  const p = new PdfHelper(doc, fontRegular, fontBold, fontMono);

  // Title Block
  p.addTitle(
    'WorkPilot — Demo Video Script & Recording Guide',
    'CentrAlign AI Engineering Challenge | Candidate: Gara Sriram (IIIT Allahabad)'
  );

  p.addParagraph(
    'This comprehensive guide provides an exact, second-by-second walkthrough to record your 2.5 to 3-minute submission video. It is specifically structured to satisfy all 9 grading dimensions in CentrAlign AI\'s hiring rubric.'
  );

  // Section 1: Pre-Recording Checklist
  p.addSectionHeading('1. Pre-Recording Setup & Checklist (5 Minutes Before Recording)');
  p.addBullet('Live App URL:', 'Open https://workpilot-hnvp.onrender.com in Chrome or Brave. Ensure it displays healthy system status.');
  p.addBullet('Screen Recorder:', 'Use Loom (https://www.loom.com), OBS Studio, or Windows Game Bar (Win+G). Keep microphone audio clear.');
  p.addBullet('Browser Tabs to Prepare:', 'Tab 1: WorkPilot Live UI (Overview/Dashboard). Tab 2: GitHub repo (https://github.com/Gara-Sriram/WorkPilot). Tab 3: MongoDB Atlas or Health endpoint.');
  p.addBullet('Clean Slate Reset:', 'In the WorkPilot UI header, click the "Reset Demo" button or ensure demo invoices are ready so your walkthrough executes cleanly in real time.');
  p.addBullet('Target Duration:', '2 Minutes 30 Seconds to 3 Minutes 15 Seconds (the ideal length for engineering recruiters and hiring managers).');

  // Section 2: Scene-by-Scene Timeline & Narration
  p.addSectionHeading('2. Scene-by-Scene Timeline, Screen Actions & Spoken Script');

  // Scene 1
  p.addSubheading('Scene 1: Introduction & The Core Problem (0:00 - 0:30)');
  p.addBullet('What to Show On Screen:', 'Show the WorkPilot dashboard at https://workpilot-hnvp.onrender.com. Point cursor to the tagline: "From instructions to verified outcomes."');
  p.addParagraph(
    '"Hi everyone, my name is Gara Sriram from IIIT Allahabad, and today I\'m presenting WorkPilot—an autonomous AI employee engineered for enterprise workflows. Most generative AI tools today are conversational chatbots: you send a prompt, they return text, and if they hallucinate, the user has to manually catch the error. WorkPilot is fundamentally different. Given a high-level instruction, it autonomously formulates a structured execution plan, runs sandboxed tools against real PDF invoices, persists records into a MongoDB General Ledger, pauses for human approval on high-value amounts, and independently verifies every outcome against raw source data before completing."',
    true
  );

  // Scene 2
  p.addSubheading('Scene 2: Workflow 1 — Autonomous End-to-End Execution (0:30 - 1:15)');
  p.addBullet('What to Show On Screen:', 'Click on "Tasks & Execution" tab. Click the quick preset prompt: "Find the latest Acme Technologies invoice, extract its details, create a finance record, and verify it." Click "Run Task". Watch steps 1 to 5 turn green in real time.');
  p.addParagraph(
    '"Let\'s see it in action. I\'ll submit an instruction: \'Find the latest Acme Technologies invoice, extract details, create a finance record, and verify.\' Notice what happens: WorkPilot immediately uses Google Gemini to decompose this goal into a 5-step dependency-ordered plan. It executes search_documents to locate the invoice, extract_invoice to read raw PDF text, validate_invoice to check data types and dates, create_finance_record to persist into MongoDB, and finally verify_finance_record. Notice this green card: all 6 verification checks passed with 100% fidelity comparing database state directly against raw PDF text. Zero hallucination."',
    true
  );

  // Scene 3
  p.addSubheading('Scene 3: Workflow 2 — Human-in-the-Loop Governance & Safe Resume (1:15 - 2:05)');
  p.addBullet('What to Show On Screen:', 'Click "New Task". Click quick prompt: "Find the Globex Logistics invoice GLX-9942, extract details, create finance record, and verify." Click "Run Task". Show execution pausing at Step 4 with yellow "Waiting for Approval" banner. Navigate to "Approvals" tab. Review the $14,800 threshold card. Click "Approve". Return to Tasks tab and watch it resume and complete.');
  p.addParagraph(
    '"Now let\'s test consequential enterprise safety. I\'ll instruct WorkPilot to process the Globex Logistics invoice. Notice that the invoice amount is $14,800. Because this exceeds our enterprise governance threshold of $10,000, WorkPilot automatically halts execution at Step 4 and enters WAITING_FOR_APPROVAL status. Let\'s switch to the Approvals tab. As the enterprise officer, I can see the exact tool invocation, reason, and amount. When I click \'Approve\', WorkPilot safely re-hydrates execution context from prior step artifacts, creates the ledger record, executes independent verification, and reaches COMPLETED status—without corrupting state or losing data."',
    true
  );

  // Scene 4
  p.addSubheading('Scene 4: System Architecture, Idempotency & Failure Recovery (2:05 - 2:45)');
  p.addBullet('What to Show On Screen:', 'Briefly show the "Finance Records" tab (show composite unique key vendor_invoiceNumber). Then switch to VS Code or terminal showing Vitest test suite passing (20/20 tests).');
  p.addParagraph(
    '"Under the hood, WorkPilot enforces four critical architectural guarantees: First, strict Idempotency. MongoDB uses compound unique indexes on normalized vendor and invoice numbers. If the same instruction is executed twice, our idempotency guard reuses the verified record without creating duplicate entries. Second, Transient Self-Healing: network and database hiccups trigger bounded jittered exponential retries, while schema violations terminate safely. Third, Sandboxing: all 7 tools enforce strict Zod schema validation. And finally, complete test coverage: our Vitest suite passes 20 out of 20 unit and integration tests with an isolated in-memory database."',
    true
  );

  // Scene 5
  p.addSubheading('Scene 5: Conclusion & Wrap-Up (2:45 - 3:00)');
  p.addBullet('What to Show On Screen:', 'Switch back to the live web application dashboard showing the stats overview, health status, and live URL.');
  p.addParagraph(
    '"To summarize: WorkPilot takes enterprise AI from chat prompts to independently verified, governed business outcomes. The application is fully open-source on GitHub, includes comprehensive documentation in PROJECT_EXPLANATION.md, and is deployed live on Render. Thank you for your time and consideration!"',
    true
  );

  // Section 3: High-Scoring Tips
  p.addSectionHeading('3. Scoring 10/10: What CentrAlign AI Evaluators Grade On');
  p.addBullet('Speak With Ownership:', 'Use phrases like "I engineered", "I designed", "Our architecture". Emphasize that you understand the entire codebase.');
  p.addBullet('Focus on "Verification vs. Chatbot":', 'CentrAlign specifically wants autonomous workers, not conversation bots. Keep highlighting that the independent verification engine guarantees accuracy.');
  p.addBullet('Show Real Failure & Approval:', 'Do not show only happy paths. Showing the $10,000 approval pause and resume proves real engineering.');
  p.addBullet('Highlight Full-Stack Reality:', 'Show that this is not a mock UI: it talks to MongoDB Atlas, extracts real PDF files, and executes live tools.');

  const pdfBytes = await doc.save({ useObjectStreams: false });
  await fs.writeFile(OUTPUT_PDF_PATH, pdfBytes);
  console.log(`[Success] PDF generated at: ${OUTPUT_PDF_PATH} (${pdfBytes.length} bytes)`);
  return OUTPUT_PDF_PATH;
}

buildPdf().catch(err => {
  console.error('[PDF Generation Error]:', err);
  process.exit(1);
});
