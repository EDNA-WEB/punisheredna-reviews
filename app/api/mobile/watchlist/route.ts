import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getMobileUser } from '@/lib/mobileAuth';

export const dynamic = 'force-dynamic';

const WATCHLIST_LIST_TITLE = 'Chcem vidieť';

// Rovnaká logika ako web (/api/watchlist) — WatchlistItem je hlavný zdroj,
// zároveň sa udržiava synchronizovaný MovieList "Chcem vidieť" pre
// spätnú kompatibilitu s inými časťami webu.
export async function GET(req: Request) {
  try {
    const me = await getMobileUser(req);
    if (!me) return NextResponse.json({ error: 'Neplatné nebo vypršelé přihlášení.' }, { status: 401 });

    const items = await prisma.watchlistItem.findMany({
      where: { userId: me.id },
      orderBy: { createdAt: 'desc' },
      select: { movie: { select: { id: true, title: true, slug: true, poster: true, year: true, genres: true } } }
    });

    return NextResponse.json({ movies: items.map((i) => i.movie) }, { status: 200 });
  } catch (error) {
    console.error('[api/mobile/watchlist GET]', error);
    return NextResponse.json({ error: 'Chyba při načítání.' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const me = await getMobileUser(req);
    if (!me) return NextResponse.json({ error: 'Neplatné nebo vypršelé přihlášení.' }, { status: 401 });

    const { movieId } = await req.json();
    if (!movieId) return NextResponse.json({ error: 'Chýba movieId.' }, { status: 400 });

    let list = await prisma.movieList.findFirst({ where: { authorId: me.id, title: WATCHLIST_LIST_TITLE } });
    if (!list) list = await prisma.movieList.create({ data: { authorId: me.id, title: WATCHLIST_LIST_TITLE } });

    const existing = await prisma.watchlistItem.findUnique({ where: { userId_movieId: { userId: me.id, movieId } } });
    if (existing) {
      await prisma.watchlistItem.delete({ where: { id: existing.id } });
      const listItem = await prisma.movieListItem.findFirst({ where: { listId: list.id, movieId } });
      if (listItem) await prisma.movieListItem.delete({ where: { id: listItem.id } });
      return NextResponse.json({ inWatchlist: false }, { status: 200 });
    } else {
      await prisma.watchlistItem.create({ data: { userId: me.id, movieId } });
      const listItem = await prisma.movieListItem.findFirst({ where: { listId: list.id, movieId } });
      if (!listItem) await prisma.movieListItem.create({ data: { listId: list.id, movieId } });
      return NextResponse.json({ inWatchlist: true }, { status: 201 });
    }
  } catch (error) {
    console.error('[api/mobile/watchlist POST]', error);
    return NextResponse.json({ error: 'Požadavek selhal.' }, { status: 400 });
  }
}
