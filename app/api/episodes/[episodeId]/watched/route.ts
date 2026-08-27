import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request, { params }: { params: { episodeId: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Musíš byť prihlásený.' }, { status: 401 });
  const userId = (session.user as any).id;

  await prisma.watchedEpisode.upsert({
    where: { userId_episodeId: { userId, episodeId: params.episodeId } },
    update: {},
    create: { userId, episodeId: params.episodeId }
  });

  return NextResponse.json({ ok: true, watched: true });
}

export async function DELETE(req: Request, { params }: { params: { episodeId: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Musíš byť prihlásený.' }, { status: 401 });
  const userId = (session.user as any).id;

  await prisma.watchedEpisode.deleteMany({ where: { userId, episodeId: params.episodeId } });
  return NextResponse.json({ ok: true, watched: false });
}
