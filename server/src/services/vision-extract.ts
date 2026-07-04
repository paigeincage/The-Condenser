// ═══════════════════════════════════════════════
// THE CONDENSER — Claude Extraction
// Sends document content (raw PDF, image, or text) to Claude.
// Single call does BOTH extraction AND classification.
// ═══════════════════════════════════════════════

import { anthropic } from '../lib/anthropic.js';
import { tradeListForPrompt, CLASSIFICATION_RULES } from './classify.js';

export interface ExtractedItem {
  text: string;
  trade: string;
  priority: 'normal' | 'elevated' | 'hot';
  location: string | null;
  repaired: boolean;
}

const SYSTEM_PROMPT = `You are an expert construction document reader for residential home building.
You will receive images of document pages (inspection reports, punch lists, field notes, screenshots).

Your job: Extract every individual deficiency / punch item from the document and classify it.

TRADE CATEGORIES:
${tradeListForPrompt()}
- Uncategorized (only if truly no match)

CLASSIFICATION RULES:
${CLASSIFICATION_RULES}

FOR EACH DEFICIENCY ITEM, RETURN:
- text: Clean, actionable description of the issue. Fix grammar, remove jargon, keep it specific.
- trade: The single best trade category from the list above.
- priority: "normal", "elevated" (active water/moisture/leak), or "hot" (safety, code violation, structural, urgent, mold).
- location: Room or area if mentioned, null if not.
- repaired: true if the document marks this item as repaired/completed/addressed, false otherwise.

RULES:
- ONE deficiency per item. If a section lists multiple issues, split them.
- Do NOT include items that are satisfactory / passing / no issues.
- Do NOT include boilerplate, disclaimers, maintenance checklists, or inspector info.
- If you see tables with checkboxes, extract only the deficient/failed items.
- If text is hard to read or handwritten, do your best and note [unclear] for illegible parts.
- Deduplicate: if the same item appears on multiple pages (e.g. summary page), include it only once.
- Keep the text concise but complete — enough for a trade partner to understand what to fix.

Return ONLY valid JSON — no markdown fences, no explanation:
[{"text": "...", "trade": "...", "priority": "normal", "location": null, "repaired": false}]

If no deficiency items are found, return: []`;

/**
 * Extract punch items by sending the raw PDF straight to Claude as a native
 * document block. Claude parses both text-based and scanned/image PDFs itself,
 * so this single path replaces the old canvas/pdfjs page-rendering fallback.
 * Limits (enforced by the caller): ~30 MB file size, 100 pages.
 */
export async function extractFromPdf(
  base64Pdf: string,
  feedbackExamples?: { text: string; correctedTrade: string }[]
): Promise<ExtractedItem[]> {
  let userPrompt = 'Extract all deficiency / punch list items from this document.';
  if (feedbackExamples && feedbackExamples.length > 0) {
    const examples = feedbackExamples
      .slice(0, 20)
      .map((f) => `  "${f.text}" → ${f.correctedTrade}`)
      .join('\n');
    userPrompt += `\n\nNote: The user has previously corrected these classifications:\n${examples}`;
  }

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    system: SYSTEM_PROMPT.replace(
      'You will receive images of document pages (inspection reports, punch lists, field notes, screenshots).',
      'You will receive a document (inspection report, punch list, field notes) as a PDF.'
    ),
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'document',
            source: { type: 'base64', media_type: 'application/pdf', data: base64Pdf },
          },
          { type: 'text', text: userPrompt },
        ],
      },
    ],
  });

  const textBlock = response.content.find((b) => b.type === 'text');
  const raw = textBlock?.text?.trim() || '[]';
  const jsonStr = raw.replace(/^```json?\n?/, '').replace(/\n?```$/, '');
  return JSON.parse(jsonStr);
}

/**
 * Extract from a single image (screenshot, photo).
 */
export async function extractFromImage(
  base64: string,
  mimeType: 'image/png' | 'image/jpeg' | 'image/webp',
  feedbackExamples?: { text: string; correctedTrade: string }[]
): Promise<ExtractedItem[]> {
  const content: Array<
    | { type: 'image'; source: { type: 'base64'; media_type: 'image/png' | 'image/jpeg' | 'image/gif' | 'image/webp'; data: string } }
    | { type: 'text'; text: string }
  > = [];

  content.push({
    type: 'image',
    source: { type: 'base64', media_type: mimeType, data: base64 },
  });

  let userPrompt = 'Extract all deficiency / punch list items from this image.';
  if (feedbackExamples && feedbackExamples.length > 0) {
    const examples = feedbackExamples
      .slice(0, 20)
      .map((f) => `  "${f.text}" → ${f.correctedTrade}`)
      .join('\n');
    userPrompt += `\n\nNote: The user has previously corrected these classifications:\n${examples}`;
  }

  content.push({ type: 'text', text: userPrompt });

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content }],
  });

  const textBlock = response.content.find((b) => b.type === 'text');
  const raw = textBlock?.text?.trim() || '[]';
  const jsonStr = raw.replace(/^```json?\n?/, '').replace(/\n?```$/, '');
  return JSON.parse(jsonStr);
}

/**
 * Extract punch items from raw PDF text using Claude (no vision needed).
 * Used when pdf-parse extracts clean text from the PDF.
 */
export async function extractFromText(
  text: string,
  feedbackExamples?: { text: string; correctedTrade: string }[]
): Promise<ExtractedItem[]> {
  let userPrompt = `Extract all deficiency / punch list items from this document text and classify each one.\n\nDOCUMENT TEXT:\n${text.slice(0, 200000)}`;

  if (feedbackExamples && feedbackExamples.length > 0) {
    const examples = feedbackExamples
      .slice(0, 20)
      .map((f) => `  "${f.text}" → ${f.correctedTrade}`)
      .join('\n');
    userPrompt += `\n\nNote: The user has previously corrected these classifications:\n${examples}`;
  }

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    system: SYSTEM_PROMPT.replace(
      'You will receive images of document pages (inspection reports, punch lists, field notes, screenshots).',
      'You will receive the raw text of a document (inspection report, punch list, field notes).'
    ),
    messages: [{ role: 'user', content: userPrompt }],
  });

  const textBlock = response.content.find((b) => b.type === 'text');
  const raw = textBlock?.text?.trim() || '[]';
  const jsonStr = raw.replace(/^```json?\n?/, '').replace(/\n?```$/, '');
  return JSON.parse(jsonStr);
}
