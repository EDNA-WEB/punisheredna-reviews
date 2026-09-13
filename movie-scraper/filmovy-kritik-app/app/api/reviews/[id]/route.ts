import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

async function requireAuthorOrAdmin(reviewId: string) {
  const session = await getServerSession(authOptions);
  if (!session) return { session: null, review: null };
  const review = await prisma.review.findUnique({ where: { id: reviewId } });
  if (!review) return { session, review: null };
  const isAdmin = (session.user as any).role === 'ADMIN';
  const isAuthor = review.authorId === (session.user as any).id;
  if (!isAdmin && !isAuthor) return { session: null, review };
  return { session, review };
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const { session, review: existing } = await requireAuthorOrAdmin(params.id);
  if (!existing) return NextResponse.json({ error: 'Recenzia sa nenašla.' }, { status: 404 });
  if (!session) return NextResponse.json({ error: 'Nemáš oprávnenie na túto akciu.' }, { status: 403 });

  const data = await req.json();
  if (!data.body || !String(data.body).trim()) {
    return NextResponse.json({ error: 'Text recenzie nemôže byť prázdny.' }, { status: 400 });
  }
  if (String(data.body).length > 20000) {
    return NextResponse.json({ error: 'Text recenzie je príliš dlhý (max. 20 000 znakov).' }, { status: 400 });
  }

  const updated = await prisma.review.update({
    where: { id: params.id },
    data: { body: String(data.body).trim() }
  });

  if (data.rating && Number(data.rating) > 0) {
    const existingRating = await prisma.rating.findFirst({ where: { movieId: existing.movieId, userId: existing.authorId, seasonId: null, episodeId: null } });
    if (existingRating) {
      await prisma.rating.update({ where: { id: existingRating.id }, data: { value: Number(data.rating) } });
    } else {
      await prisma.rating.create({ data: { movieId: existing.movieId, userId: existing.authorId, value: Number(data.rating) } });
    }
  }

  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const { session, review: existing } = await requireAuthorOrAdmin(params.id);
  if (!existing) return NextResponse.json({ error: 'Recenzia sa nenašla.' }, { status: 404 });
  if (!session) return NextResponse.json({ error: 'Nemáš oprávnenie na túto akciu.' }, { status: 403 });

  await prisma.review.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
