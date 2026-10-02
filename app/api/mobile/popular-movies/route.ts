import { NextResponse } from 'next/server';
import { filterViewer } from '@/lib/movieFilterAuth';
import { getFilterCatalog } from '@/lib/movieFilter';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 12;

// Populárne filmy pre appku — zoradené podľa POČTU hodnotení (ako na webe).
// Berie sa z katalógu filtra v pamäti servera → žiadny ďalší dopyt do
// databázy (predtým triedenie cez všetky hodnotenia pri každom volaní).
export async function GET(req: Request) {
  const viewer = await filterViewer(req);
  if (!viewer.userId) return NextResponse.json({ error: 'Musíš být přihlášen.' }, { status: 401 });
  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(0, parseInt(searchParams.get('page') || '0', 10) || 0);
    const contentType = searchParams.get('contentType');

    const catalog = await getFilterCatalog();
    const list = (contentType ? catalog.filter((m) => m.contentType === contentType) : catalog)
      .slice()
      .sort((a, b) => b.ratingCount - a.ratingCount || b.popularity - a.popularity);

    const movies = list.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE).map((m) => ({
      id: m.id,
      title: m.title,
      slug: m.slug,
      poster: m.poster,
      year: m.yearRaw,
      genres: m.genres.join(', '),
      countries: m.countries.join(', '),
      averageRating: m.ratingCount ? m.ratingAvg : null
    }));

    return NextResponse.json({ movies, totalPages: Math.ceil(list.length / PAGE_SIZE) }, { status: 200, headers: { 'Cache-Control': 'private, max-age=300' } });
  } catch (error) {
    console.error('[api/mobile/popular-movies]', error);
    return NextResponse.json({ error: 'Chyba při načítání filmů.' }, { status: 500 });
  }
}
