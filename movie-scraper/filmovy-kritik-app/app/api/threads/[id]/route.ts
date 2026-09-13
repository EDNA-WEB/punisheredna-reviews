import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Musíš byť prihlásený.' }, { status: 401 });

  const thread = await prisma.thread.findUnique({ where: { id: params.id } });
  if (!thread) return NextResponse.json({ error: 'Vlákno sa nenašlo.' }, { status: 404 });

  const isAdmin = (session.user as any).role === 'ADMIN';
  if (!isAdmin && thread.authorId !== (session.user as any).id) {
    return NextResponse.json({ error: 'Nemáš oprávnenie zmazať toto vlákno.' }, { status: 403 });
  }

  await prisma.thread.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
