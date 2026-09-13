import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Musíš byť prihlásený.' }, { status: 401 });
  const userId = (session.user as any).id;

  const { episodeId, body } = await req.json();
  if (!episodeId) return NextResponse.json({ error: 'Chýba episodeId.' }, { status: 400 });

  const text = String(body || '').trim();

  if (!text) {
    await prisma.episodeNote.deleteMany({ where: { episodeId, userId } });
    return NextResponse.json({ ok: true, deleted: true });
  }
  if (text.length > 2000) {
    return NextResponse.json({ error: 'Poznámka môže mať najviac 2000 znakov.' }, { status: 400 });
  }

  const note = await prisma.episodeNote.upsert({
    where: { episodeId_userId: { episodeId, userId } },
    update: { body: text },
    create: { episodeId, userId, body: text }
  });

  return NextResponse.json(note);
}
