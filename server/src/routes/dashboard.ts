import { Router } from 'express';
import { prisma } from '../lib/prisma.js';

export const dashboardRouter = Router();

const STAGES = ['Pre-construction', 'Framing', 'Drywall', 'Paint', 'Trim', 'Tile', 'Punch', 'Complete'];

function parseDate(s: string | null | undefined): Date | null {
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}
function startOfWeek(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = (x.getDay() + 6) % 7; // Monday = 0
  x.setDate(x.getDate() - day);
  return x;
}
function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}
function relTime(d: Date, now: Date): string {
  const days = daysBetween(d, now);
  if (days <= 0) return 'today';
  if (days === 1) return '1d';
  if (days < 7) return `${days}d`;
  if (days < 30) return `${Math.round(days / 7)}w`;
  return `${Math.round(days / 30)}mo`;
}

// GET /api/dashboard — real per-user rollup that mirrors the projects/items on the home page.
dashboardRouter.get('/', async (req, res) => {
  const userId = req.user!.userId;
  const now = new Date();

  const projects = await prisma.project.findMany({
    where: { userId },
    include: { items: true },
  });

  // ── Hero metrics
  const activeHomes = projects.filter((p) => p.stage !== 'Complete').length;
  const completed = projects.filter((p) => p.stage === 'Complete');
  const completedThisMonth = completed.filter((p) => {
    const c = parseDate(p.completedAt);
    return c && c.getFullYear() === now.getFullYear() && c.getMonth() === now.getMonth();
  }).length;
  const completedThisQuarter = completed.filter((p) => {
    const c = parseDate(p.completedAt);
    return c && c.getFullYear() === now.getFullYear() && Math.floor(c.getMonth() / 3) === Math.floor(now.getMonth() / 3);
  }).length;
  const buildDurations = completed
    .map((p) => {
      const s = parseDate(p.startDate);
      const c = parseDate(p.completedAt);
      return s && c ? daysBetween(s, c) : null;
    })
    .filter((d): d is number => d !== null && d > 0);
  const avgBuildDays = buildDurations.length
    ? Math.round(buildDurations.reduce((a, b) => a + b, 0) / buildDurations.length)
    : null;

  // ── Homes by stage (only non-empty, canonical order)
  const stageData = STAGES.map((stage) => ({
    stage,
    count: projects.filter((p) => p.stage === stage).length,
  })).filter((d) => d.count > 0);

  // ── Build velocity — avg build days by completion month, last 6 months
  const monthBuckets: Record<string, number[]> = {};
  for (const p of completed) {
    const s = parseDate(p.startDate);
    const c = parseDate(p.completedAt);
    if (!s || !c) continue;
    const key = `${c.getFullYear()}-${c.getMonth()}`;
    (monthBuckets[key] ||= []).push(daysBetween(s, c));
  }
  const velocity: { month: string; avgDays: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const bucket = monthBuckets[key];
    if (bucket && bucket.length) {
      velocity.push({
        month: d.toLocaleDateString('en-US', { month: 'short' }),
        avgDays: Math.round(bucket.reduce((a, b) => a + b, 0) / bucket.length),
      });
    }
  }

  // ── Punch items per week — last 8 weeks by item.createdAt
  const thisWeek = startOfWeek(now);
  const punchActivity: { week: string; count: number }[] = [];
  for (let i = 7; i >= 0; i--) {
    const weekStart = new Date(thisWeek);
    weekStart.setDate(weekStart.getDate() - i * 7);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);
    let count = 0;
    for (const p of projects) {
      for (const it of p.items) {
        const created = new Date(it.createdAt);
        if (created >= weekStart && created < weekEnd) count++;
      }
    }
    punchActivity.push({ week: weekStart.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' }), count });
  }

  // ── Busiest trades — open (not done) items per trade
  const tradeMap: Record<string, { count: number; homes: Set<string> }> = {};
  for (const p of projects) {
    for (const it of p.items) {
      if (it.status === 'done') continue;
      const t = it.trade || 'Uncategorized';
      (tradeMap[t] ||= { count: 0, homes: new Set() }).count++;
      tradeMap[t].homes.add(p.id);
    }
  }
  const tradeLoad = Object.entries(tradeMap)
    .map(([name, v]) => ({ name, value: v.count, count: v.homes.size }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  // ── Needs attention — overdue items (dueDate < today, not done), aggregated per home
  const overdueByProject: Record<string, { address: string; count: number; trades: Set<string>; worst: number }> = {};
  for (const p of projects) {
    for (const it of p.items) {
      if (it.status === 'done') continue;
      const due = parseDate(it.dueDate);
      if (!due || due >= now) continue;
      const rec = (overdueByProject[p.id] ||= { address: p.address, count: 0, trades: new Set(), worst: 0 });
      rec.count++;
      rec.trades.add(it.trade || 'Uncategorized');
      rec.worst = Math.max(rec.worst, daysBetween(due, now));
    }
  }
  const needsAttention = Object.entries(overdueByProject)
    .sort(([, a], [, b]) => b.worst - a.worst)
    .slice(0, 6)
    .map(([id, r]) => ({
      id,
      title: r.address,
      subtitle: `${r.count} overdue punch item${r.count > 1 ? 's' : ''} · ${[...r.trades][0]}`,
      timestamp: `${r.worst}d`,
      accent: 'warn' as const,
    }));

  // ── Upcoming closes — homes with a target date in the next 21 days, not complete
  const upcoming = projects
    .filter((p) => p.stage !== 'Complete')
    .map((p) => ({ p, t: parseDate(p.targetDate) }))
    .filter((x): x is { p: (typeof projects)[number]; t: Date } => x.t !== null && daysBetween(now, x.t) >= 0 && daysBetween(now, x.t) <= 21)
    .sort((a, b) => a.t.getTime() - b.t.getTime())
    .slice(0, 5)
    .map(({ p, t }) => ({
      id: p.id,
      title: p.address,
      subtitle: `Target close: ${daysBetween(now, t)}d`,
      timestamp: t.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      accent: 'info' as const,
    }));

  // ── Recent activity — most recently touched items across all homes
  const recentItems = projects
    .flatMap((p) => p.items.map((it) => ({ it, address: p.address })))
    .sort((a, b) => new Date(b.it.updatedAt).getTime() - new Date(a.it.updatedAt).getTime())
    .slice(0, 6)
    .map(({ it, address }) => ({
      id: it.id,
      title: `${it.status === 'done' ? 'Completed' : 'Punch item'} · ${address}`,
      subtitle: it.text.length > 60 ? it.text.slice(0, 57) + '…' : it.text,
      timestamp: relTime(new Date(it.updatedAt), now),
      accent: it.status === 'done' ? ('success' as const) : undefined,
    }));

  res.json({
    heroes: { activeHomes, completedThisMonth, completedThisQuarter, avgBuildDays },
    stageData,
    velocity,
    punchActivity,
    tradeLoad,
    needsAttention,
    upcoming,
    recentActivity: recentItems,
    hasProjects: projects.length > 0,
  });
});
