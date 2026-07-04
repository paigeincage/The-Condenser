// ═══════════════════════════════════════════════
// THE CONDENSER — PDF Text Extraction
// Strategy: Extract text via pdf-parse v2 (pure JS, pdfjs-based).
// If the text is rich enough, the caller sends it to Claude as text.
// If not (scanned doc) — or if this throws — the caller falls back to
// sending the raw PDF to Claude as a native document block.
// ═══════════════════════════════════════════════

import fs from 'fs';
import { PDFParse } from 'pdf-parse';

export interface PdfContent {
  text: string;
  pageCount: number;
  hasRichText: boolean;
}

/**
 * Extract text from a PDF using pdf-parse v2.
 * Returns the full text and whether it's "rich" (has enough content to classify).
 * Throws on unreadable/corrupt PDFs — callers must catch and fall back.
 */
export async function extractPdfText(filePath: string): Promise<PdfContent> {
  const data = new Uint8Array(fs.readFileSync(filePath));
  const parser = new PDFParse({ data });
  try {
    const result = await parser.getText();
    const pageCount = result.total ?? 0;

    // Consider text "rich" if we get at least 50 chars per page on average
    const avgCharsPerPage = result.text.length / Math.max(pageCount, 1);
    const hasRichText = avgCharsPerPage > 50;

    return { text: result.text, pageCount, hasRichText };
  } finally {
    await parser.destroy();
  }
}

export async function getPageCount(filePath: string): Promise<number> {
  const content = await extractPdfText(filePath);
  return content.pageCount;
}
