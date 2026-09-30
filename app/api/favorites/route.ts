import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const FAVORITES_LIST_TITLE = 'Obľúbené';
const MAX_FAVORITES = 10;

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Musíš byť prihlásený.' }, { status: 401 });
  const userId = (session.user as any).id;

  const { movieId } = await req.json();
  if (!movieId) return NextResponse.json({ error: 'Chýba movieId.' }, { status: 400 });

  const targetMovie = await prisma.movie.findUnique({ where: { id: movieId }, select: { contentType: true } });
  if (!targetMovie) return NextResponse.json({ error: 'Film se nenašel.' }, { status: 404 });

  // Nájdi (alebo vytvor) automatický zoznam "Obľúbené" tohto používateľa.
  let list = await prisma.movieList.findFirst({ where: { authorId: userId, title: FAVORITES_LIST_TITLE } });
  if (!list) {
    list = await prisma.movieList.create({ data: { authorId: userId, title: FAVORITES_LIST_TITLE } });
  }

  const existing = await prisma.movieListItem.findFirst({ where: { listId: list.id, movieId } });
  if (existing) {
    await prisma.movieListItem.delete({ where: { id: existing.id } });
    return NextResponse.json({ inFavorites: false });
  } else {
    const currentItems = await prisma.movieListItem.findMany({
      where: { listId: list.id },
      include: { movie: { select: { contentType: true } } }
    });
    const sameTypeCount = currentItems.filter((i) => i.movie.contentType === targetMovie.contentType).length;
    if (sameTypeCount >= MAX_FAVORITES) {
      const label = targetMovie.contentType === 'Seriál' ? 'seriálů' : 'filmov';
      return NextResponse.json({ error: `Můžeš mít maximálně ${MAX_FAVORITES} oblíbených ${label}.` }, { status: 400 });
    }
    await prisma.movieListItem.create({ data: { listId: list.id, movieId } });
    return NextResponse.json({ inFavorites: true });
  }
}
