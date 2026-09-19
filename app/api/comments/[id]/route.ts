import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { isActiveMember } from '@/lib/membership';

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Musíš byť prihlásený.' }, { status: 401 });

  const comment = await prisma.comment.findUnique({ where: { id: params.id } });
  if (!comment) return NextResponse.json({ error: 'Komentár sa nenašiel.' }, { status: 404 });

  const isAdmin = (session.user as any).role === 'ADMIN';
  const isOwner = comment.userId === (session.user as any).id;
  if (!isAdmin && !isOwner) {
    return NextResponse.json({ error: 'Nemáš oprávnenie upraviť tento komentár.' }, { status: 403 });
  }
  if (isOwner && !isAdmin && !(await isActiveMember((session.user as any).id))) {
    return NextResponse.json({ error: 'Úprava vlastných komentárov je dostupná len pre Golden Ticket členov.' }, { status: 403 });
  }

  const { body } = await req.json();
  const trimmed = String(body || '').trim();
  if (!trimmed) return NextResponse.json({ error: 'Komentár nemôže byť prázdny.' }, { status: 400 });
  if (trimmed.length > 2000) return NextResponse.json({ error: 'Komentár je príliš dlhý (max. 2000 znakov).' }, { status: 400 });

  const updated = await prisma.comment.update({ where: { id: params.id }, data: { body: trimmed } });
  return NextResponse.json({ id: updated.id, body: updated.body, updatedAt: updated.updatedAt });
}

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
  if (isOwner && !isAdmin && !(await isActiveMember((session.user as any).id))) {
    return NextResponse.json({ error: 'Mazanie vlastných komentárov je dostupné len pre Golden Ticket členov.' }, { status: 403 });
  }

  await prisma.comment.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
