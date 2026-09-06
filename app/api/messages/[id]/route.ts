import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const DELETE_WINDOW_MS = 30 * 60 * 1000;

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Musíš byť prihlásený.' }, { status: 401 });
  const myId = (session.user as any).id;

  const message = await prisma.message.findUnique({ where: { id: params.id } });
  if (!message) return NextResponse.json({ error: 'Správa sa nenašla.' }, { status: 404 });
  if (message.senderId !== myId) {
    return NextResponse.json({ error: 'Môžeš mazať len vlastné správy.' }, { status: 403 });
  }
  if (Date.now() - message.createdAt.getTime() > DELETE_WINDOW_MS) {
    return NextResponse.json({ error: 'Správu je možné zmazať len do 30 minút od odoslania.' }, { status: 403 });
  }
  if (message.read) {
    return NextResponse.json({ error: 'Túto správu už druhá strana videla, nedá sa zmazať.' }, { status: 403 });
  }

  await prisma.message.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
