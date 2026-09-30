import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getMobileUser } from '@/lib/mobileAuth';

import { hasInjectedObject } from '@/lib/inputGuard';
export const dynamic = 'force-dynamic';

// Vyhradený názov zoznamu, čo slúži ako "obľúbené filmy" — appka aj web
// (keby sa táto appková funkcia raz preniesla aj tam) ho poznajú podľa
// tohto presného textu, nezobrazuje sa používateľovi.
const FAVORITES_LIST_TITLE = 'Obľúbené';
const MAX_FAVORITES = 10;

async function getOrCreateFavoritesList(userId: string) {
  let list = await prisma.movieList.findFirst({ where: { authorId: userId, title: FAVORITES_LIST_TITLE } });
  if (!list) list = await prisma.movieList.create({ data: { authorId: userId, title: FAVORITES_LIST_TITLE } });
  return list;
}

export async function GET(req: Request) {
  try {
    const me = await getMobileUser(req);
    if (!me) return NextResponse.json({ error: 'Neplatné nebo vypršelé přihlášení.' }, { status: 401 });

    const list = await prisma.movieList.findFirst({
      where: { authorId: me.id, title: FAVORITES_LIST_TITLE },
      include: {
        items: {
          orderBy: { order: 'asc' },
          include: { movie: { select: { id: true, title: true, slug: true, poster: true, releaseDate: true, contentType: true } } }
        }
      }
    });

    const movieIds = (list?.items || []).map((i) => i.movie.id);
    const myRatings = await prisma.rating.findMany({
      where: { userId: me.id, movieId: { in: movieIds }, seasonId: null, episodeId: null },
      select: { movieId: true, value: true }
    });
    const myReviews = await prisma.review.findMany({
      where: { authorId: me.id, movieId: { in: movieIds }, seasonId: null, episodeId: null },
      select: { movieId: true, id: true }
    });

    const movies = (list?.items || []).map((i) => ({
      ...i.movie,
      myRating: myRatings.find((r) => r.movieId === i.movie.id)?.value ?? null,
      myReviewId: myReviews.find((r) => r.movieId === i.movie.id)?.id ?? null
    }));

    return NextResponse.json(
      {
        movies: movies.filter((m) => m.contentType !== 'Seriál'),
        series: movies.filter((m) => m.contentType === 'Seriál'),
        max: MAX_FAVORITES
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[api/mobile/favorite-movies GET]', error);
    return NextResponse.json({ error: 'Chyba při načítání.' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const me = await getMobileUser(req);
    if (!me) return NextResponse.json({ error: 'Neplatné nebo vypršelé přihlášení.' }, { status: 401 });

    const { movieId } = await req.json();
    if (hasInjectedObject(movieId)) return NextResponse.json({ error: 'Neplatné údaje.' }, { status: 400 });
    if (!movieId) return NextResponse.json({ error: 'Chýba movieId.' }, { status: 400 });

    const targetMovie = await prisma.movie.findUnique({ where: { id: movieId }, select: { contentType: true } });
    if (!targetMovie) return NextResponse.json({ error: 'Film se nenašel.' }, { status: 404 });

    const list = await getOrCreateFavoritesList(me.id);
    const existingItems = await prisma.movieListItem.findMany({
      where: { listId: list.id },
      include: { movie: { select: { contentType: true } } }
    });
    const sameTypeCount = existingItems.filter((i) => i.movie.contentType === targetMovie.contentType).length;
    if (sameTypeCount >= MAX_FAVORITES) {
      const label = targetMovie.contentType === 'Seriál' ? 'seriálů' : 'filmů';
      return NextResponse.json({ error: `Můžeš mít maximálně ${MAX_FAVORITES} oblíbených ${label}.` }, { status: 400 });
    }

    await prisma.movieListItem.create({ data: { listId: list.id, movieId, order: existingItems.length } });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return NextResponse.json({ error: 'Tento film už máš mezi oblíbenými.' }, { status: 409 });
    }
    console.error('[api/mobile/favorite-movies POST]', error);
    return NextResponse.json({ error: 'Požadavek selhal.' }, { status: 400 });
  }
}

export async function DELETE(req: Request) {
  try {
    const me = await getMobileUser(req);
    if (!me) return NextResponse.json({ error: 'Neplatné nebo vypršelé přihlášení.' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const movieId = searchParams.get('movieId');
    if (!movieId) return NextResponse.json({ error: 'Chýba movieId.' }, { status: 400 });

    const list = await prisma.movieList.findFirst({ where: { authorId: me.id, title: FAVORITES_LIST_TITLE } });
    if (list) await prisma.movieListItem.deleteMany({ where: { listId: list.id, movieId } });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error('[api/mobile/favorite-movies DELETE]', error);
    return NextResponse.json({ error: 'Požadavek selhal.' }, { status: 400 });
  }
}
