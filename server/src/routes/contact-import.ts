import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { upload } from '../middleware/upload.js';
import { extractPdfText } from '../services/pdf-text.js';
import { anthropic } from '../lib/anthropic.js';
import fs from 'fs';
import * as XLSX from 'xlsx';

export const contactImportRouter = Router();

interface RawContact {
  name: string;
  email: string;
  phone: string;
  company: string;
  trade: string;
}

function normalizePhone(raw: string): string {
  if (!raw) return '';
  return raw.replace(/[^\d+]/g, '');
}

/** Parse a .vcf (vCard) file into contacts */
function parseVcf(content: string): RawContact[] {
  const contacts: RawContact[] = [];
  const cards = content.split('BEGIN:VCARD');

  for (const card of cards) {
    if (!card.includes('END:VCARD')) continue;

    let name = '';
    let email = '';
    let phone = '';
    let company = '';

    const lines = card.split(/\r?\n/);
    for (const line of lines) {
      if (line.startsWith('FN:') || line.startsWith('FN;')) {
        name = line.split(':').slice(1).join(':').trim();
      } else if (line.match(/^EMAIL[;:]/i)) {
        email = line.split(':').slice(1).join(':').trim();
      } else if (line.match(/^TEL[;:]/i)) {
        phone = normalizePhone(line.split(':').slice(1).join(':').trim());
      } else if (line.startsWith('ORG:') || line.startsWith('ORG;')) {
        company = line.split(':').slice(1).join(':').replace(/;/g, ' ').trim();
      }
    }

    if (name) {
      contacts.push({ name, email, phone, company, trade: '' });
    }
  }
  return contacts;
}

/** Parse an Excel or CSV file into contacts */
function parseSpreadsheet(filePath: string): RawContact[] {
  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]!]!;
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });

  if (rows.length === 0) return [];

  // Auto-detect column mapping (case-insensitive, flexible names)
  const headers = Object.keys(rows[0]!);
  const find = (patterns: string[]) =>
    headers.find((h) => patterns.some((p) => h.toLowerCase().includes(p))) || '';

  const nameCol = find(['name', 'full name', 'contact']);
  const firstCol = find(['first']);
  const lastCol = find(['last']);
  const emailCol = find(['email', 'e-mail']);
  const phoneCol = find(['phone', 'mobile', 'cell', 'tel']);
  const companyCol = find(['company', 'org', 'business']);
  const tradeCol = find(['trade', 'category', 'type', 'specialty']);

  return rows.map((row) => {
    const first = String(row[firstCol] || '').trim();
    const last = String(row[lastCol] || '').trim();
    const fullName = nameCol ? String(row[nameCol] || '').trim() : '';
    const name = fullName || [first, last].filter(Boolean).join(' ');

    return {
      name,
      email: String(row[emailCol] || '').trim(),
      phone: normalizePhone(String(row[phoneCol] || '')),
      company: String(row[companyCol] || '').trim(),
      trade: String(row[tradeCol] || '').trim(),
    };
  }).filter((c) => c.name);
}

/** Extract contacts from a PDF's text using Claude Haiku. */
async function parsePdfContacts(filePath: string): Promise<RawContact[]> {
  const { text } = await extractPdfText(filePath);
  if (!text.trim()) return [];

  const prompt = `Extract every distinct person or company contact from the text below.
Return ONLY a JSON array: [{"name":"","email":"","phone":"","company":"","trade":""}]
Rules:
- "name" is required — skip any entry with no name.
- "phone": keep digits only (a leading + is ok). "email": lowercase.
- "trade": their construction trade/specialty if stated (e.g. Drywall, Plumbing), else "".
- Never invent data. Leave a field as "" when it isn't present.

TEXT:
${text.slice(0, 12000)}`;

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 4096,
    messages: [{ role: 'user', content: prompt }],
  });
  const block = response.content.find((b) => b.type === 'text');
  const raw = (block && 'text' in block ? block.text : '[]').trim().replace(/^```json?\n?/, '').replace(/\n?```$/, '');
  let arr: unknown;
  try {
    arr = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(arr)) return [];
  return arr
    .map((c: Record<string, unknown>) => ({
      name: String(c.name || '').trim(),
      email: String(c.email || '').trim(),
      phone: normalizePhone(String(c.phone || '')),
      company: String(c.company || '').trim(),
      trade: String(c.trade || '').trim(),
    }))
    .filter((c) => c.name);
}

contactImportRouter.post('/', upload.single('file'), async (req, res) => {
  const file = req.file;
  if (!file) {
    res.status(400).json({ error: 'No file uploaded' });
    return;
  }

  try {
    let parsed: RawContact[] = [];
    const ext = file.originalname.toLowerCase();

    if (ext.endsWith('.vcf')) {
      const content = fs.readFileSync(file.path, 'utf-8');
      parsed = parseVcf(content);
    } else if (/\.(csv|tsv|txt|xlsx|xlsm|xls|ods|numbers)$/.test(ext)) {
      parsed = parseSpreadsheet(file.path);
    } else if (ext.endsWith('.pdf')) {
      parsed = await parsePdfContacts(file.path);
    } else {
      res.status(400).json({ error: 'Unsupported file type. Use PDF, Excel (.xlsx/.xls), CSV, or a phone contacts file (.vcf).' });
      return;
    }

    if (parsed.length === 0) {
      res.status(400).json({ error: 'No contacts found in file' });
      return;
    }

    // Return parsed contacts for preview (don't save yet)
    res.json({ contacts: parsed, count: parsed.length });
  } catch (err) {
    res.status(500).json({ error: `Import failed: ${err}` });
  } finally {
    // Clean up the temp upload
    fs.unlinkSync(file.path);
  }
});

// Confirm import — save parsed contacts to DB (scoped to authenticated user)
contactImportRouter.post('/confirm', async (req, res) => {
  const userId = req.user!.userId;
  const { contacts } = req.body as { contacts: RawContact[] };
  if (!contacts || !contacts.length) {
    res.status(400).json({ error: 'No contacts to import' });
    return;
  }

  const created = await prisma.contact.createMany({
    data: contacts.map((c) => ({
      userId,
      name: c.name,
      email: c.email || '',
      phone: c.phone || '',
      company: c.company || '',
      trade: c.trade || '',
      notes: '',
      preferredChannel: c.email ? 'email' : 'text',
    })),
  });

  res.json({ imported: created.count });
});
