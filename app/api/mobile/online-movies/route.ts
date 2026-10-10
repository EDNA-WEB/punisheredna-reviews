import { NextResponse } from 'next/server';
import { cdnHeaders } from '@/lib/memoCache';
import { unstable_cache } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { getMoviePercents } from '@/lib/moviePercents';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 12;

// Rovnaký zdroj ako "Teraz dostupné online" na webe — filmy zoradené podľa
// toho, kedy boli (naposledy) pridané online, každý film len raz.
//
// Výkon: pôvodne sa pri každom otvorení appky načítali VŠETKY záznamy
// MovieStreamingService a zoskupovali sa až v kóde. Teraz to urobí databáza
// (GROUP BY + LIMIT) a výsledok sa na 2 minúty cachuje.
const getOnlinePage = unstable_cache(
  async (page: number) => {
    const [rows, totalRows] = await Promise.all([
      prisma.$queryRawUnsafe<{ movieId: string }[]>(
        `SELECT s."movieId", MAX(s."createdAt") AS "addedAt"
         FROM "MovieStreamingService" s JOIN "Movie" m ON m."id" = s."movieId"
         WHERE m."approved" = true
         GROUP BY s."movieId"
         ORDER BY "addedAt" DESC
         LIMIT $1::int OFFSET $2::int`,
        PAGE_SIZE,
        page * PAGE_SIZE
      ),
      prisma.$queryRawUnsafe<{ total: number }[]>(
        `SELECT COUNT(DISTINCT s."movieId")::int AS "total"
         FROM "MovieStreamingService" s JOIN "Movie" m ON m."id" = s."movieId"
         WHERE m."approved" = true`
      )
    ]);
    const ids = rows.map((r) => r.movieId);
    const movies = ids.length
      ? await prisma.movie.findMany({ where: { id: { in: ids } }, select: { id: true, title: true, slug: true, poster: true, year: true } })
      : [];
    const byId = new Map(movies.map((m) => [m.id, m]));
    return {
      movies: ids.map((id) => byId.get(id)).filter(Boolean) as typeof movies,
      totalPages: Math.max(1, Math.ceil((totalRows[0]?.total || 0) / PAGE_SIZE))
    };
  },
  ['mobile-online-movies'],
  { revalidate: 120 }
);

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const page = Math.min(10_000, Math.max(0, parseInt(searchParams.get('page') || '0', 10) || 0));

    const { movies, totalPages } = await getOnlinePage(page);

    // Percento hodnotenia do rohu plagátu.
    const percents = await getMoviePercents(movies.map((m) => m.id));
    const withRating = movies.map((m) => ({ ...m, ...(percents[m.id] || { percent: null, percentColor: null }) }));

    return NextResponse.json({ movies: withRating, totalPages }, { status: 200, headers: cdnHeaders(120) });
  } catch (error) {
    console.error('[api/mobile/online-movies]', error);
    return NextResponse.json({ error: 'Chyba při načítání filmů.' }, { status: 500 });
  }
}
