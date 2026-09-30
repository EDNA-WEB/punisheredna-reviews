import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

import { hasInjectedObject } from '@/lib/inputGuard';
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Musíš byť prihlásený.' }, { status: 401 });
  const userId = (session.user as any).id;

  const { movieId, body } = await req.json();
  if (hasInjectedObject(movieId)) return NextResponse.json({ error: 'Neplatné údaje.' }, { status: 400 });
  if (!movieId) return NextResponse.json({ error: 'Chýba movieId.' }, { status: 400 });

  const text = String(body || '').trim();

  if (!text) {
    // prázdny text = zmazať poznámku
    await prisma.movieNote.deleteMany({ where: { movieId, userId } });
    return NextResponse.json({ ok: true, deleted: true });
  }
  if (text.length > 2000) {
    return NextResponse.json({ error: 'Poznámka může mít nejvýše 2000 znaků.' }, { status: 400 });
  }

  const note = await prisma.movieNote.upsert({
    where: { movieId_userId: { movieId, userId } },
    update: { body: text },
    create: { movieId, userId, body: text }
  });

  return NextResponse.json(note);
}
