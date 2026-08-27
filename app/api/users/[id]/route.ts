import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Nemáš oprávnenie na túto akciu.' }, { status: 403 });
  }

  const target = await prisma.user.findUnique({ where: { id: params.id } });
  if (!target) return NextResponse.json({ error: 'Používateľ sa nenašiel.' }, { status: 404 });
  if (target.role === 'ADMIN') {
    return NextResponse.json({ error: 'Administrátorský účet nemôže byť zablokovaný.' }, { status: 400 });
  }

  const body = await req.json();
  const data: Record<string, any> = {};
  if ('banned' in body) data.banned = !!body.banned;
  if ('reviewsDisabled' in body) data.reviewsDisabled = !!body.reviewsDisabled;
  if ('ratingsDisabled' in body) data.ratingsDisabled = !!body.ratingsDisabled;
  if ('commentsDisabled' in body) data.commentsDisabled = !!body.commentsDisabled;

  const updated = await prisma.user.update({
    where: { id: params.id },
    data
  });

  return NextResponse.json({
    id: updated.id,
    banned: updated.banned,
    reviewsDisabled: updated.reviewsDisabled,
    ratingsDisabled: updated.ratingsDisabled,
    commentsDisabled: updated.commentsDisabled
  });
}
