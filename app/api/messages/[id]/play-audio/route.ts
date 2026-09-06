import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

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

  const audioUrl = message.audio;
  // Na rozdiel od fotky (tú len označíme ako zobrazenú) sa hlasovka po prehratí
  // skutočne odstráni z databázy — už sa nedá vôbec nikde znova pustiť, ani
  // priamym prístupom k tejto adrese.
  await prisma.message.update({ where: { id: params.id }, data: { audio: null, audioPlayedAt: new Date() } });

  return NextResponse.json({ audio: audioUrl });
}
