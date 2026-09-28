import { NextResponse } from 'next/server';
import { unstable_cache } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { getMoviePercents } from '@/lib/moviePercents';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 12;

// Rovnaký zdroj ako katalóg na webe — naposledy pridané filmy/seriály,
// zoradené od najnovšieho. Appka posiela ?page=0,1,2...
// Výkon: výsledok sa na 60 s cachuje — hlavná obrazovka appky ho pýta pri
// každom otvorení a nové filmy nepribúdajú každú sekundu.
const getRecentPage = unstable_cache(
  async (page: number) =>
    Promise.all([
      prisma.movie.findMany({
        where: { approved: true },
        orderBy: { createdAt: 'desc' },
        skip: page * PAGE_SIZE,
        take: PAGE_SIZE,
        select: { id: true, title: true, slug: true, poster: true, year: true, genres: true }
      }),
      prisma.movie.count({ where: { approved: true } })
    ]),
  ['mobile-recent-movies'],
  { revalidate: 60 }
);

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(0, parseInt(searchParams.get('page') || '0', 10) || 0);

    const [movies, total] = await getRecentPage(page);

    // Percento hodnotenia do rohu plagátu.
    const percents = await getMoviePercents(movies.map((m) => m.id));
    const withRating = movies.map((m) => ({ ...m, ...(percents[m.id] || { percent: null, percentColor: null }) }));

    return NextResponse.json({ movies: withRating, totalPages: Math.ceil(total / PAGE_SIZE) }, { status: 200 });
  } catch (error) {
    console.error('[api/mobile/recent-movies]', error);
    return NextResponse.json({ error: 'Chyba pri načítaní filmov.' }, { status: 500 });
  }
}
