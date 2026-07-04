import { Router } from 'express';
import { prisma } from '../lib/prisma.js';

export const itemsRouter = Router();

// Create items (bulk — used after extraction review).
// Every referenced project must belong to the authenticated user.
itemsRouter.post('/bulk', async (req, res) => {
  const userId = req.user!.userId;
  const { items } = req.body as {
    items: {
      projectId: string;
      text: string;
      trade?: string;
      priority?: string;
      source?: string;
      sourceFileId?: string;
      location?: string;
      assignee?: string;
    }[];
  };

  if (!items || !items.length) {
    res.status(400).json({ error: 'items array is required' });
    return;
  }

  // Verify ownership of every project referenced in the batch
  const projectIds = [...new Set(items.map((i) => i.projectId))];
  const owned = await prisma.project.findMany({
    where: { id: { in: projectIds }, userId },
    select: { id: true },
  });
  if (owned.length !== projectIds.length) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }

  const created = await prisma.punchItem.createMany({
    data: items.map((item) => ({
      projectId: item.projectId,
      text: item.text,
      trade: item.trade || 'Uncategorized',
      priority: item.priority || 'normal',
      source: item.source || 'Manual',
      sourceFileId: item.sourceFileId || null,
      location: item.location || '',
      assignee: item.assignee || '',
    })),
  });

  // Update extracted item count on source files (only files in the user's projects)
  const fileIds = [...new Set(items.filter((i) => i.sourceFileId).map((i) => i.sourceFileId!))];
  for (const fileId of fileIds) {
    const count = items.filter((i) => i.sourceFileId === fileId).length;
    await prisma.sourceFile.updateMany({
      where: { id: fileId, project: { userId } },
      data: { extractedItemCount: { increment: count } },
    });
  }

  res.json({ count: created.count });
});

// Update single item (must belong to one of the user's projects)
itemsRouter.patch('/:id', async (req, res) => {
  const userId = req.user!.userId;
  const existing = await prisma.punchItem.findFirst({
    where: { id: req.params.id, project: { userId } },
  });
  if (!existing) {
    res.status(404).json({ error: 'Item not found' });
    return;
  }

  const { text, trade, assignee, status, priority, notes, location } = req.body;
  const item = await prisma.punchItem.update({
    where: { id: req.params.id },
    data: {
      ...(text !== undefined && { text }),
      ...(trade !== undefined && { trade }),
      ...(assignee !== undefined && { assignee }),
      ...(status !== undefined && { status }),
      ...(priority !== undefined && { priority }),
      ...(notes !== undefined && { notes }),
      ...(location !== undefined && { location }),
    },
  });
  res.json({ item });
});

// Delete item (must belong to one of the user's projects)
itemsRouter.delete('/:id', async (req, res) => {
  const userId = req.user!.userId;
  const deleted = await prisma.punchItem.deleteMany({
    where: { id: req.params.id, project: { userId } },
  });
  if (deleted.count === 0) {
    res.status(404).json({ error: 'Item not found' });
    return;
  }
  res.json({ ok: true });
});
