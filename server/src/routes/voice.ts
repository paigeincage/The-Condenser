// ═══════════════════════════════════════════════
// THE CONDENSER — Voice → Punch Items
// Accepts transcribed text from browser Web Speech
// and runs it through the same text-extract pipeline.
// ═══════════════════════════════════════════════

import { Router } from 'express';
import { extractFromText } from '../services/vision-extract.js';
import { prisma } from '../lib/prisma.js';

export const voiceRouter = Router();

voiceRouter.post('/extract', async (req, res) => {
  const { text } = req.body as { text?: string };
  if (!text || typeof text !== 'string' || text.trim().length < 3) {
    res.status(400).json({ error: 'text is required and must be at least 3 characters' });
    return;
  }

  try {
    const feedback = await prisma.classificationFeedback
      .findMany({ where: { userId: req.user!.userId }, orderBy: { createdAt: 'desc' }, take: 20 })
      .then((rows) => rows.map((f) => ({ text: f.originalText, correctedTrade: f.correctedTrade })))
      .catch(() => []);

    const items = await extractFromText(text.trim(), feedback);
    res.json({ items, transcription: text.trim() });
  } catch (err) {
    console.error('[voice.extract] failed:', err);
    res.status(500).json({ error: String(err) });
  }
});
