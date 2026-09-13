import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function DELETE(req: Request, { params }: { params: { id: string; itemId: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Musíš byť prihlásený.' }, { status: 401 });
  const userId = (session.user as any).id;

  const list = await prisma.movieList.findUnique({ where: { id: params.id } });
  if (!list) return NextResponse.json({ error: 'Zoznam sa nenašiel.' }, { status: 404 });
  if (list.authorId !== userId) return NextResponse.json({ error: 'Nemáš oprávnenie na túto akciu.' }, { status: 403 });

  await prisma.movieListItem.deleteMany({ where: { id: params.itemId, listId: params.id } });
  return NextResponse.json({ ok: true });
}
