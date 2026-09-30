import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireMobileAdmin } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';

// Používatelia: ?q= vyhľadávanie podľa prezývky, ?filter=all|banned|members|new
export async function GET(req: Request) {
  if (!(await requireMobileAdmin(req))) return NextResponse.json({ error: 'Nemáš oprávnění.' }, { status: 403 });
  const sp = new URL(req.url).searchParams;
  const q = (sp.get('q') || '').trim().slice(0, 50);
  const filter = sp.get('filter') || 'all';
  const where: any = { deleted: false };
  if (q) where.name = { contains: q, mode: 'insensitive' };
  if (filter === 'banned') where.banned = true;
  if (filter === 'members') where.membershipUntil = { gt: new Date() };
  if (filter === 'new') where.createdAt = { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) };
  const users = await prisma.user.findMany({
    where,
    orderBy: q ? { name: 'asc' } : { createdAt: 'desc' },
    take: 60,
    select: {
      id: true, name: true, avatar: true, role: true, isEditor: true, banned: true,
      createdAt: true, lastActiveAt: true, membershipUntil: true,
      _count: { select: { reviews: true, ratings: true } }
    }
  });
  return NextResponse.json({ items: users });
}
