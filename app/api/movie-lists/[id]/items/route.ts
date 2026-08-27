import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Musíš byť prihlásený.' }, { status: 401 });
  const userId = (session.user as any).id;

  const list = await prisma.movieList.findUnique({ where: { id: params.id } });
  if (!list) return NextResponse.json({ error: 'Zoznam sa nenašiel.' }, { status: 404 });
  if (list.authorId !== userId) return NextResponse.json({ error: 'Nemáš oprávnenie na túto akciu.' }, { status: 403 });

  const { movieId } = await req.json();
  if (!movieId) return NextResponse.json({ error: 'Chýba movieId.' }, { status: 400 });

  const movie = await prisma.movie.findUnique({ where: { id: movieId }, select: { id: true, title: true, slug: true, poster: true, year: true } });
  if (!movie) return NextResponse.json({ error: 'Film sa nenašiel.' }, { status: 404 });

  const existing = await prisma.movieListItem.findUnique({ where: { listId_movieId: { listId: params.id, movieId } } });
  if (existing) return NextResponse.json({ error: 'Tento film je už v zozname.' }, { status: 400 });

  const count = await prisma.movieListItem.count({ where: { listId: params.id } });
  if (count >= 300) return NextResponse.json({ error: 'Zoznam môže mať najviac 300 filmov.' }, { status: 400 });

  const item = await prisma.movieListItem.create({ data: { listId: params.id, movieId, order: count } });
  return NextResponse.json({ id: item.id, movie });
}
