import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getMobileUser } from '@/lib/mobileAuth';

export const dynamic = 'force-dynamic';

// Vyhradený názov zoznamu, čo slúži ako "obľúbené filmy" — appka aj web
// (keby sa táto appková funkcia raz preniesla aj tam) ho poznajú podľa
// tohto presného textu, nezobrazuje sa používateľovi.
const FAVORITES_LIST_TITLE = '__oblibene_filmy__';
const MAX_FAVORITES = 10;

async function getOrCreateFavoritesList(userId: string) {
  let list = await prisma.movieList.findFirst({ where: { authorId: userId, title: FAVORITES_LIST_TITLE } });
  if (!list) list = await prisma.movieList.create({ data: { authorId: userId, title: FAVORITES_LIST_TITLE } });
  return list;
}

export async function GET(req: Request) {
  try {
    const me = await getMobileUser(req);
    if (!me) return NextResponse.json({ error: 'Neplatné alebo vypršané prihlásenie.' }, { status: 401 });

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

    return NextResponse.json({ movies, max: MAX_FAVORITES }, { status: 200 });
  } catch (error) {
    console.error('[api/mobile/favorite-movies GET]', error);
    return NextResponse.json({ error: 'Chyba při načítání.' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const me = await getMobileUser(req);
    if (!me) return NextResponse.json({ error: 'Neplatné alebo vypršané prihlásenie.' }, { status: 401 });

    const { movieId } = await req.json();
    if (!movieId) return NextResponse.json({ error: 'Chýba movieId.' }, { status: 400 });

    const list = await getOrCreateFavoritesList(me.id);
    const count = await prisma.movieListItem.count({ where: { listId: list.id } });
    if (count >= MAX_FAVORITES) {
      return NextResponse.json({ error: `Můžeš mít maximálně ${MAX_FAVORITES} oblíbených filmů.` }, { status: 400 });
    }

    await prisma.movieListItem.create({ data: { listId: list.id, movieId, order: count } });
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
    if (!me) return NextResponse.json({ error: 'Neplatné alebo vypršané prihlásenie.' }, { status: 401 });

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
