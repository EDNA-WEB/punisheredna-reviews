import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Musíš byť prihlásený.' }, { status: 401 });
  const userId = (session.user as any).id;

  const { seasonId, body } = await req.json();
  if (!seasonId) return NextResponse.json({ error: 'Chýba seasonId.' }, { status: 400 });

  const text = String(body || '').trim();

  if (!text) {
    // prázdny text = zmazať poznámku
    await prisma.seasonNote.deleteMany({ where: { seasonId, userId } });
    return NextResponse.json({ ok: true, deleted: true });
  }
  if (text.length > 2000) {
    return NextResponse.json({ error: 'Poznámka môže mať najviac 2000 znakov.' }, { status: 400 });
  }

  const note = await prisma.seasonNote.upsert({
    where: { seasonId_userId: { seasonId, userId } },
    update: { body: text },
    create: { seasonId, userId, body: text }
  });

  return NextResponse.json(note);
}
