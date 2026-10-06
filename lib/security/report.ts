import { prisma } from '../prisma';
import { ACTION_LABELS } from './activityLog';
import { describeDevice, maskIp } from './clientInfo';

export type ReportScope = { userId: string; from: string; to: string };

export function parseRange(from?: string | null, to?: string | null) {
  const today = new Date();
  const toD = to && /^\d{4}-\d{2}-\d{2}$/.test(to) ? new Date(`${to}T23:59:59.999Z`) : today;
  const fromD = from && /^\d{4}-\d{2}-\d{2}$/.test(from) ? new Date(`${from}T00:00:00.000Z`) : new Date(toD.getTime() - 30 * 24 * 60 * 60_000);
  return { fromD, toD };
}

export async function findUserByQuery(q: string) {
  const s = q.trim();
  if (!s) return null;
  return prisma.user.findFirst({
    where: { OR: [{ id: s }, { email: s.toLowerCase() }, { name: { equals: s, mode: 'insensitive' } }] },
    select: { id: true, name: true, email: true, createdAt: true }
  });
}

// Riadky záznamov s doplneným popisom cieľa (komu správa, ku ktorému filmu…).
export async function loadActivityRows(userId: string, fromD: Date, toD: Date, opts: { fullIp: boolean }) {
  const rows = await prisma.activityLog.findMany({
    where: { userId, createdAt: { gte: fromD, lte: toD } },
    orderBy: { createdAt: 'desc' },
    take: 2000
  });
  const ids = (a: string[]) => Array.from(new Set(rows.filter((r) => a.includes(r.action) && r.targetId).map((r) => r.targetId as string)));
  const [users, movies, threads] = await Promise.all([
    prisma.user.findMany({ where: { id: { in: ids(['message']) } }, select: { id: true, name: true } }),
    prisma.movie.findMany({ where: { id: { in: ids(['review', 'comment', 'thread']) } }, select: { id: true, title: true } }),
    prisma.thread.findMany({ where: { id: { in: ids(['post']) } }, select: { id: true, title: true } })
  ]);
  const name = new Map<string, string>();
  users.forEach((u) => name.set(u.id, `uživateli ${u.name}`));
  movies.forEach((m) => name.set(m.id, `„${m.title}“`));
  threads.forEach((t) => name.set(t.id, `téma „${t.title}“`));
  return rows.map((r) => ({
    id: r.id,
    createdAt: r.createdAt.toISOString(),
    action: r.action,
    label: (ACTION_LABELS[r.action] || r.action) + (r.targetId && name.get(r.targetId) ? (r.action === 'message' ? ' → ' : ' · ') + name.get(r.targetId) : ''),
    ip: opts.fullIp ? r.ip || '—' : maskIp(r.ip),
    device: describeDevice(r.userAgent),
    userAgent: opts.fullIp ? r.userAgent || '' : undefined
  }));
}
