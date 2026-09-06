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
  if (!message.image) {
    return NextResponse.json({ error: 'Táto správa neobsahuje fotku.' }, { status: 400 });
  }
  if (message.imageViewedAt) {
    return NextResponse.json({ error: 'Táto fotka už bola zobrazená a je nedostupná.' }, { status: 410 });
  }

  const updated = await prisma.message.update({ where: { id: params.id }, data: { imageViewedAt: new Date() } });
  return NextResponse.json({ image: message.image, viewedAt: updated.imageViewedAt });
}
