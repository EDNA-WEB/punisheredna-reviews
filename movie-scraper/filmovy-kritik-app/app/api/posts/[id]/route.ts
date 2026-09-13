import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Musíš byť prihlásený.' }, { status: 401 });

  const post = await prisma.post.findUnique({ where: { id: params.id } });
  if (!post) return NextResponse.json({ error: 'Príspevok sa nenašiel.' }, { status: 404 });

  const isAdmin = (session.user as any).role === 'ADMIN';
  if (!isAdmin && post.authorId !== (session.user as any).id) {
    return NextResponse.json({ error: 'Nemáš oprávnenie zmazať tento príspevok.' }, { status: 403 });
  }

  await prisma.post.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
