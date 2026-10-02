import { NextResponse } from 'next/server';
import { filterViewer } from '@/lib/movieFilterAuth';
import { unstable_cache } from 'next/cache';
import { getFilterCatalog } from '@/lib/movieFilter';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 12;

// Populárne filmy pre appku — zoradené podľa POČTU hodnotení (ako na webe).
// Berie sa z katalógu filtra v pamäti servera → žiadny ďalší dopyt do
// databázy (predtým triedenie cez všetky hodnotenia pri každom volaní).
// Hotová stránka zoznamu (12 filmov) sa ukladá do zdieľanej cache Vercelu na
// 15 minút. Nová inštancia servera tak nemusí kvôli populárnym filmom
// načítavať celý katalóg — kľúč cache tvorí typ obsahu a číslo stránky.
const getPopularPage = unstable_cache(
  async (contentType: string | null, page: number) => {
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
    return { movies, totalPages: Math.ceil(list.length / PAGE_SIZE) };
  },
  ['mobile-popular-movies-v1'],
  { revalidate: 900, tags: ['movie-filter'] }
);

export async function GET(req: Request) {
  const viewer = await filterViewer(req);
  if (!viewer.userId) return NextResponse.json({ error: 'Musíš být přihlášen.' }, { status: 401 });
  try {
    const { searchParams } = new URL(req.url);
    const page = Math.min(500, Math.max(0, parseInt(searchParams.get('page') || '0', 10) || 0));
    const contentType = searchParams.get('contentType');

    const { movies, totalPages } = await getPopularPage(contentType || null, page);

    return NextResponse.json({ movies, totalPages }, { status: 200, headers: { 'Cache-Control': 'private, max-age=300' } });
  } catch (error) {
    console.error('[api/mobile/popular-movies]', error);
    return NextResponse.json({ error: 'Chyba při načítání filmů.' }, { status: 500 });
  }
}
