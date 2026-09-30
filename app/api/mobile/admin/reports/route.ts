import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireMobileAdmin } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';

// Nahlásenia: ?type=online (nefunkčné online odkazy) | chat (nahlásené konverzácie)
export async function GET(req: Request) {
  if (!(await requireMobileAdmin(req))) return NextResponse.json({ error: 'Nemáš oprávnění.' }, { status: 403 });
  const type = new URL(req.url).searchParams.get('type') === 'chat' ? 'chat' : 'online';
  if (type === 'online') {
    const items = await prisma.onlineReport.findMany({
      where: { resolved: false },
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: {
        id: true,
        note: true,
        createdAt: true,
        movie: { select: { id: true, title: true, slug: true, poster: true, year: true, watchUrl: true } },
        reporter: { select: { id: true, name: true } }
      }
    });
    return NextResponse.json({ items });
  }
  const items = await prisma.messageReport.findMany({
    where: { reviewed: false },
    orderBy: { createdAt: 'desc' },
    take: 100,
    select: {
      id: true,
      transcript: true,
      createdAt: true,
      reporter: { select: { id: true, name: true, avatar: true } },
      reportedUser: { select: { id: true, name: true, avatar: true, banned: true } }
    }
  });
  return NextResponse.json({ items });
}
