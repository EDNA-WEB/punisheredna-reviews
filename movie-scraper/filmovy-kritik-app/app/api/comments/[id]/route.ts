import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Musíš byť prihlásený.' }, { status: 401 });
  }

  const comment = await prisma.comment.findUnique({ where: { id: params.id } });
  if (!comment) return NextResponse.json({ error: 'Komentár sa nenašiel.' }, { status: 404 });

  const isAdmin = (session.user as any).role === 'ADMIN';
  const isOwner = comment.userId === (session.user as any).id;
  if (!isAdmin && !isOwner) {
    return NextResponse.json({ error: 'Nemáš oprávnenie zmazať tento komentár.' }, { status: 403 });
  }

  await prisma.comment.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
