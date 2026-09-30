import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { isActiveMember } from '@/lib/membership';

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Musíš byť prihlásený.' }, { status: 401 });

  const comment = await prisma.comment.findUnique({ where: { id: params.id } });
  if (!comment) return NextResponse.json({ error: 'Komentář se nenašel.' }, { status: 404 });

  const isAdmin = (session.user as any).role === 'ADMIN';
  const isOwner = comment.userId === (session.user as any).id;
  if (!isAdmin && !isOwner) {
    return NextResponse.json({ error: 'Nemáš oprávnění upravit tento komentář.' }, { status: 403 });
  }
  if (isOwner && !isAdmin && !(await isActiveMember((session.user as any).id))) {
    return NextResponse.json({ error: 'Úprava vlastních komentářů je dostupná jen pro Golden Ticket členy.' }, { status: 403 });
  }

  const { body } = await req.json();
  const trimmed = String(body || '').trim();
  if (!trimmed) return NextResponse.json({ error: 'Komentář nemůže být prázdný.' }, { status: 400 });
  if (trimmed.length > 2000) return NextResponse.json({ error: 'Komentář je příliš dlouhý (max. 2000 znaků).' }, { status: 400 });

  const updated = await prisma.comment.update({ where: { id: params.id }, data: { body: trimmed } });
  return NextResponse.json({ id: updated.id, body: updated.body, updatedAt: updated.updatedAt });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Musíš byť prihlásený.' }, { status: 401 });
  }

  const comment = await prisma.comment.findUnique({ where: { id: params.id } });
  if (!comment) return NextResponse.json({ error: 'Komentář se nenašel.' }, { status: 404 });

  const isAdmin = (session.user as any).role === 'ADMIN';
  const isOwner = comment.userId === (session.user as any).id;
  if (!isAdmin && !isOwner) {
    return NextResponse.json({ error: 'Nemáš oprávnění smazat tento komentář.' }, { status: 403 });
  }
  if (isOwner && !isAdmin && !(await isActiveMember((session.user as any).id))) {
    return NextResponse.json({ error: 'Mazání vlastních komentářů je dostupné jen pro Golden Ticket členy.' }, { status: 403 });
  }

  await prisma.comment.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
