import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

import { healthRouter } from './routes/health.js';
import { authRouter } from './routes/auth.js';
import { waitlistRouter } from './routes/waitlist.js';
import { filesRouter } from './routes/files.js';
import { projectsRouter } from './routes/projects.js';
import { dashboardRouter } from './routes/dashboard.js';
import { itemsRouter } from './routes/items.js';
import { contactsRouter } from './routes/contacts.js';
import { extractRouter } from './routes/extract.js';
import { feedbackRouter } from './routes/feedback.js';
import { contactImportRouter } from './routes/contact-import.js';
import { voiceRouter } from './routes/voice.js';
import { requireAuth } from './middleware/auth.js';

const app = express();
const PORT = parseInt(process.env.PORT || '3001');

app.use(cors({ origin: process.env.CORS_ORIGIN || '*', credentials: true }));
app.use(express.json({ limit: '50mb' }));

// Public routes
app.use('/api/health', healthRouter);
app.use('/api/auth', authRouter);
app.use('/api/waitlist', waitlistRouter);

// Protected routes — require valid JWT
app.use('/api/files', requireAuth, filesRouter);
app.use('/api/projects', requireAuth, projectsRouter);
app.use('/api/dashboard', requireAuth, dashboardRouter);
app.use('/api/items', requireAuth, itemsRouter);
app.use('/api/contacts', requireAuth, contactsRouter);
app.use('/api/extract', requireAuth, extractRouter);
app.use('/api/feedback', requireAuth, feedbackRouter);
app.use('/api/contacts/import', requireAuth, contactImportRouter);
app.use('/api/voice', requireAuth, voiceRouter);

// Serve frontend in production
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const frontendDist = path.join(__dirname, '../../dist');
app.use(express.static(frontendDist));
app.get('/{*path}', (_req, res) => {
  res.sendFile(path.join(frontendDist, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[Condenser API] Running on port ${PORT}`);
});
