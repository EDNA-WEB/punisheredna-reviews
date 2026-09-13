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
  if (!message.image) {
    return NextResponse.json({ error: 'Táto fotka už bola zobrazená a je nedostupná.' }, { status: 410 });
  }

  // Prvé otvorenie spustí 1-minútové okno — počas neho sa fotka dá zobraziť aj
  // opakovane (napr. pri obnovení stránky). Až po uplynutí tejto minúty sa
  // natrvalo odstráni. Toto rieši prípady, keď by okamžité zmazanie hneď pri
  // prvom kliknutí sťažilo poriadne prezretie (napr. pomalé pripojenie).
  if (!message.imageViewedAt) {
    await prisma.message.update({ where: { id: params.id }, data: { imageViewedAt: new Date() } });
    return NextResponse.json({ image: message.image });
  }

  const elapsed = Date.now() - message.imageViewedAt.getTime();
  if (elapsed > GRACE_PERIOD_MS) {
    await prisma.message.update({ where: { id: params.id }, data: { image: null } });
    return NextResponse.json({ error: 'Táto fotka už bola zobrazená a je nedostupná.' }, { status: 410 });
  }

  return NextResponse.json({ image: message.image });
}
