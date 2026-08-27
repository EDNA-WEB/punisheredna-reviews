import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json([]);
  const userId = (session.user as any).id;

  const items = await prisma.watchlistItem.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 5,
    include: { movie: { select: { title: true, slug: true, poster: true, year: true } } }
  });

  return NextResponse.json(items.map((i) => ({ ...i.movie })));
}
