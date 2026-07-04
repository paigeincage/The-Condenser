// ═══════════════════════════════════════════════
// THE CONDENSER — Document Extraction Route
// POST /api/extract/:fileId
// Reads file from disk, dispatches by type, returns items.
// ═══════════════════════════════════════════════

import { Router } from 'express';
import fs from 'fs';
import { prisma } from '../lib/prisma.js';
import { extractPdfText, type PdfContent } from '../services/pdf-text.js';
import { extractFromPdf, extractFromImage, extractFromText } from '../services/vision-extract.js';
import { classifyTextItems } from '../services/text-classify.js';

export const extractRouter = Router();

/** Load recent classification feedback for prompt injection */
async function getFeedbackExamples() {
  const feedback = await prisma.classificationFeedback.findMany({
    orderBy: { createdAt: 'desc' },
    take: 20,
  });
  return feedback.map((f) => ({ text: f.originalText, correctedTrade: f.correctedTrade }));
}

/** Split raw text into individual lines/items */
function splitTextToItems(text: string): string[] {
  return text
    .split(/\n/)
    .map((line) => line.replace(/^\d+[\.\)]\s*/, '').trim())
    .filter((line) => line.length > 5);
}

extractRouter.post('/:fileId', async (req, res) => {
  const { fileId } = req.params;

  const file = await prisma.sourceFile.findUnique({ where: { id: fileId } });
  if (!file) {
    res.status(404).json({ error: 'File not found' });
    return;
  }

  if (!fs.existsSync(file.storagePath)) {
    res.status(404).json({ error: 'File not found on disk' });
    return;
  }

  // Mark as processing
  await prisma.sourceFile.update({
    where: { id: fileId },
    data: { extractionStatus: 'processing' },
  });

  try {
    const feedback = await getFeedbackExamples();
    let items;

    const mime = file.mimeType.toLowerCase();

    if (mime === 'application/pdf') {
      // ── PDF: Try local text extraction first (cheap, fast). If the PDF has no
      //    usable text layer (scanned) OR local parsing/text extraction fails for
      //    ANY reason, fall through to sending the raw PDF to Claude, which reads
      //    both text-based and scanned PDFs natively. ──
      let pdfContent: PdfContent | null = null;
      try {
        pdfContent = await extractPdfText(file.storagePath);
        await prisma.sourceFile.update({ where: { id: fileId }, data: { pageCount: pdfContent.pageCount } });
      } catch (err) {
        console.warn(`[Extract] Local PDF text extraction failed, will fall back to Claude PDF:`, err);
      }

      if (pdfContent?.hasRichText) {
        console.log(`[Extract] PDF has rich text (${pdfContent.text.length} chars), using text extraction`);
        try {
          items = await extractFromText(pdfContent.text, feedback);
        } catch (err) {
          console.warn(`[Extract] Text-based extraction failed, falling back to Claude PDF:`, err);
        }
      }

      if (!items) {
        // Claude's PDF input limits: ~32 MB request, 100 pages.
        const sizeBytes = fs.statSync(file.storagePath).size;
        if (sizeBytes > 30 * 1024 * 1024) {
          throw new Error('This PDF has no readable text layer and is over 30 MB, which is too large to scan. Try splitting it into smaller files.');
        }
        if (pdfContent && pdfContent.pageCount > 100) {
          throw new Error('This PDF has no readable text layer and is over 100 pages, which is too long to scan. Try splitting it into smaller files.');
        }
        console.log(`[Extract] Sending PDF to Claude as a native document (scanned or unparseable)`);
        const base64Pdf = fs.readFileSync(file.storagePath).toString('base64');
        items = await extractFromPdf(base64Pdf, feedback);
      }

    } else if (mime.startsWith('image/')) {
      // ── Image: Direct to Claude Vision ──
      const buffer = fs.readFileSync(file.storagePath);
      const base64 = buffer.toString('base64');
      const mediaType = mime as 'image/png' | 'image/jpeg' | 'image/webp';
      items = await extractFromImage(base64, mediaType, feedback);

    } else if (
      mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      mime === 'application/msword'
    ) {
      // ── DOCX: Extract text with mammoth → text classification ──
      const mammoth = await import('mammoth');
      const result = await mammoth.default.extractRawText({ path: file.storagePath });
      const textItems = splitTextToItems(result.value);
      const classified = await classifyTextItems(textItems, feedback);
      items = classified.map((c) => ({
        text: c.text,
        trade: c.trade,
        priority: c.priority,
        location: c.location,
        repaired: false,
      }));

    } else if (
      mime === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      mime === 'application/vnd.ms-excel'
    ) {
      // ── XLSX: Parse with xlsx → text classification ──
      const XLSX = await import('xlsx');
      const workbook = XLSX.default.readFile(file.storagePath);
      const allText: string[] = [];
      for (const sheetName of workbook.SheetNames) {
        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.default.utils.sheet_to_json<Record<string, unknown>>(sheet, { header: 1 });
        for (const row of rows) {
          const line = Object.values(row).filter(Boolean).join(' ').trim();
          if (line.length > 5) allText.push(line);
        }
      }
      const classified = await classifyTextItems(allText, feedback);
      items = classified.map((c) => ({
        text: c.text,
        trade: c.trade,
        priority: c.priority,
        location: c.location,
        repaired: false,
      }));

    } else if (mime === 'text/plain' || mime === 'text/csv') {
      // ── Plain text / CSV ──
      const text = fs.readFileSync(file.storagePath, 'utf-8');
      const textItems = splitTextToItems(text);
      const classified = await classifyTextItems(textItems, feedback);
      items = classified.map((c) => ({
        text: c.text,
        trade: c.trade,
        priority: c.priority,
        location: c.location,
        repaired: false,
      }));

    } else {
      await prisma.sourceFile.update({
        where: { id: fileId },
        data: { extractionStatus: 'failed' },
      });
      res.status(400).json({ error: `Unsupported file type: ${mime}` });
      return;
    }

    // Update file record
    await prisma.sourceFile.update({
      where: { id: fileId },
      data: {
        extractionStatus: 'done',
        extractedItemCount: items.length,
      },
    });

    res.json({
      fileId,
      fileName: file.originalName,
      itemCount: items.length,
      items,
    });

  } catch (err) {
    console.error(`[Extract] Error processing ${file.originalName}:`, err);
    await prisma.sourceFile.update({
      where: { id: fileId },
      data: { extractionStatus: 'failed' },
    });
    res.status(500).json({ error: 'Extraction failed', detail: String(err) });
  }
});
