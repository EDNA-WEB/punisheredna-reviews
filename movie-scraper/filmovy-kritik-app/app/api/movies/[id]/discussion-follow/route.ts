import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Musíš byť prihlásený.' }, { status: 401 });
  const userId = (session.user as any).id;

  const existing = await prisma.movieDiscussionFollow.findUnique({
    where: { userId_movieId: { userId, movieId: params.id } }
  });

  if (existing) {
    await prisma.movieDiscussionFollow.delete({ where: { id: existing.id } });
    return NextResponse.json({ following: false });
  } else {
    await prisma.movieDiscussionFollow.create({ data: { userId, movieId: params.id } });
    return NextResponse.json({ following: true });
  }
}
