import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Musíš byť prihlásený.' }, { status: 401 });
  const userId = (session.user as any).id;

  const list = await prisma.movieList.findUnique({ where: { id: params.id } });
  if (!list) return NextResponse.json({ error: 'Zoznam sa nenašiel.' }, { status: 404 });
  if (list.authorId !== userId) return NextResponse.json({ error: 'Nemáš oprávnenie na túto akciu.' }, { status: 403 });

  const { title } = await req.json();
  const trimmedTitle = String(title || '').trim();
  if (!trimmedTitle) return NextResponse.json({ error: 'Vyplň prosím názov zoznamu.' }, { status: 400 });
  if (trimmedTitle.length > 120) return NextResponse.json({ error: 'Názov je príliš dlhý (max. 120 znakov).' }, { status: 400 });

  await prisma.movieList.update({ where: { id: params.id }, data: { title: trimmedTitle } });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Musíš byť prihlásený.' }, { status: 401 });
  const userId = (session.user as any).id;
  const isAdmin = (session.user as any).role === 'ADMIN';

  const list = await prisma.movieList.findUnique({ where: { id: params.id } });
  if (!list) return NextResponse.json({ error: 'Zoznam sa nenašiel.' }, { status: 404 });
  if (list.authorId !== userId && !isAdmin) {
    return NextResponse.json({ error: 'Nemáš oprávnenie na túto akciu.' }, { status: 403 });
  }

  await prisma.movieList.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
