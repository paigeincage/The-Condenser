import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { upload } from '../middleware/upload.js';

export const filesRouter = Router();

// Upload one or more files to a project (must be owned by the authenticated user)
// Note: projectFolder must come BEFORE files in the FormData so multer can use it for destination
filesRouter.post('/upload', upload.array('files', 20), async (req, res) => {
  const { projectId } = req.body;
  const userId = req.user!.userId;

  if (!projectId) {
    res.status(400).json({ error: 'projectId is required' });
    return;
  }

  const project = await prisma.project.findFirst({ where: { id: projectId, userId } });
  if (!project) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }

  const files = req.files as Express.Multer.File[];
  if (!files || files.length === 0) {
    res.status(400).json({ error: 'No files uploaded' });
    return;
  }

  const records = await Promise.all(
    files.map((f) =>
      prisma.sourceFile.create({
        data: {
          projectId,
          originalName: f.originalname,
          mimeType: f.mimetype,
          storagePath: f.path,
          sizeBytes: f.size,
        },
      })
    )
  );

  res.json({ files: records });
});

// Download / serve a file (only if it belongs to one of the user's projects)
filesRouter.get('/:fileId/download', async (req, res) => {
  const userId = req.user!.userId;
  const file = await prisma.sourceFile.findFirst({
    where: { id: req.params.fileId, project: { userId } },
  });
  if (!file) { res.status(404).json({ error: 'File not found' }); return; }
  const fs = await import('fs');
  if (!fs.existsSync(file.storagePath)) { res.status(404).json({ error: 'File missing from disk' }); return; }
  res.download(file.storagePath, file.originalName);
});

// List files for a project (only if the project belongs to the user)
filesRouter.get('/project/:projectId', async (req, res) => {
  const userId = req.user!.userId;
  const project = await prisma.project.findFirst({ where: { id: req.params.projectId, userId } });
  if (!project) { res.status(404).json({ error: 'Project not found' }); return; }
  const files = await prisma.sourceFile.findMany({
    where: { projectId: req.params.projectId },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ files });
});
