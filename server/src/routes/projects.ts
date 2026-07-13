import { Router } from 'express';
import { prisma } from '../lib/prisma.js';

export const projectsRouter = Router();

// List all projects for the authenticated user (with status breakdown)
projectsRouter.get('/', async (req, res) => {
  const userId = req.user!.userId;
  const projects = await prisma.project.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { items: true, files: true } },
      items: { select: { status: true } },
    },
  });

  // Add status counts and strip raw items
  const result = projects.map((p) => {
    const statusCounts = { pending: 0, wip: 0, done: 0 };
    for (const item of p.items) {
      if (item.status in statusCounts) statusCounts[item.status as keyof typeof statusCounts]++;
    }
    const { items: _items, ...rest } = p;
    return { ...rest, statusCounts };
  });

  res.json({ projects: result });
});

// Get single project with items and files (verify ownership)
projectsRouter.get('/:id', async (req, res) => {
  const userId = req.user!.userId;
  const project = await prisma.project.findFirst({
    where: { id: req.params.id, userId },
    include: {
      items: { orderBy: [{ trade: 'asc' }, { createdAt: 'asc' }], include: { tradeSteps: true } },
      files: { orderBy: { createdAt: 'desc' } },
    },
  });
  if (!project) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }
  res.json({ project });
});

// Create project (auto-assign to authenticated user)
projectsRouter.post('/', async (req, res) => {
  const userId = req.user!.userId;
  const { address, community, lot, date } = req.body;
  if (!address) {
    res.status(400).json({ error: 'address is required' });
    return;
  }
  const project = await prisma.project.create({
    data: { address, community: community || '', lot: lot || '', date: date || '', userId },
  });
  res.json({ project });
});

// Update project (verify ownership)
projectsRouter.patch('/:id', async (req, res) => {
  const userId = req.user!.userId;
  const existing = await prisma.project.findFirst({ where: { id: req.params.id, userId } });
  if (!existing) { res.status(404).json({ error: 'Project not found' }); return; }
  const { address, community, lot, date, status, stage, startDate, targetDate, completedAt } = req.body;

  // Auto-stamp completedAt the first time a home reaches Complete; clear it if it leaves.
  let completedAtPatch: { completedAt?: string | null } = {};
  if (completedAt !== undefined) {
    completedAtPatch = { completedAt };
  } else if (stage !== undefined && stage !== existing.stage) {
    if (stage === 'Complete' && !existing.completedAt) {
      completedAtPatch = { completedAt: new Date().toISOString().slice(0, 10) };
    } else if (stage !== 'Complete' && existing.completedAt) {
      completedAtPatch = { completedAt: null };
    }
  }

  const project = await prisma.project.update({
    where: { id: req.params.id },
    data: {
      ...(address !== undefined && { address }),
      ...(community !== undefined && { community }),
      ...(lot !== undefined && { lot }),
      ...(date !== undefined && { date }),
      ...(status !== undefined && { status }),
      ...(stage !== undefined && { stage }),
      ...(startDate !== undefined && { startDate }),
      ...(targetDate !== undefined && { targetDate }),
      ...completedAtPatch,
    },
  });
  res.json({ project });
});

// Delete project (verify ownership)
projectsRouter.delete('/:id', async (req, res) => {
  const userId = req.user!.userId;
  const existing = await prisma.project.findFirst({ where: { id: req.params.id, userId } });
  if (!existing) { res.status(404).json({ error: 'Project not found' }); return; }
  await prisma.project.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});
