import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const FAVORITES_LIST_TITLE = 'Obľúbené';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Musíš byť prihlásený.' }, { status: 401 });
  const userId = (session.user as any).id;

  const { movieId } = await req.json();
  if (!movieId) return NextResponse.json({ error: 'Chýba movieId.' }, { status: 400 });

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
    await prisma.movieListItem.create({ data: { listId: list.id, movieId } });
    return NextResponse.json({ inFavorites: true });
  }
}
