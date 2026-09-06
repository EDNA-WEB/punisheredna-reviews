import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const GRACE_PERIOD_MS = 60 * 1000; // 1 minúta

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Musíš byť prihlásený.' }, { status: 401 });
  const myId = (session.user as any).id;

  const message = await prisma.message.findUnique({ where: { id: params.id } });
  if (!message || message.receiverId !== myId) {
    return NextResponse.json({ error: 'Správa sa nenašla.' }, { status: 404 });
  }
  if (!message.audio) {
    return NextResponse.json({ error: 'Táto hlasová správa už bola prehraná a je nedostupná.' }, { status: 410 });
  }

  // Prvé otvorenie spustí 1-minútové okno — počas neho sa hlasovka dá prehrať
  // aj opakovane (napr. pri obnovení stránky, alebo ak sa prvé prehratie nestihlo
  // poriadne stiahnuť). Až po uplynutí tejto minúty sa natrvalo odstráni.
  if (!message.audioPlayedAt) {
    await prisma.message.update({ where: { id: params.id }, data: { audioPlayedAt: new Date() } });
    return NextResponse.json({ audio: message.audio });
  }

  const elapsed = Date.now() - message.audioPlayedAt.getTime();
  if (elapsed > GRACE_PERIOD_MS) {
    await prisma.message.update({ where: { id: params.id }, data: { audio: null } });
    return NextResponse.json({ error: 'Táto hlasová správa už bola prehraná a je nedostupná.' }, { status: 410 });
  }

  return NextResponse.json({ audio: message.audio });
}
