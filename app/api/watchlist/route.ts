import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Musíš byť prihlásený.' }, { status: 401 });
  const userId = (session.user as any).id;

  const { movieId } = await req.json();
  if (!movieId) return NextResponse.json({ error: 'Chýba movieId.' }, { status: 400 });

  const existing = await prisma.watchlistItem.findUnique({ where: { userId_movieId: { userId, movieId } } });
  if (existing) {
    await prisma.watchlistItem.delete({ where: { id: existing.id } });
    return NextResponse.json({ inWatchlist: false });
  } else {
    await prisma.watchlistItem.create({ data: { userId, movieId } });
    return NextResponse.json({ inWatchlist: true });
  }
}
