import { NextResponse } from 'next/server';
import { parseFilter, runFilter } from '@/lib/movieFilter';
import { filterViewer } from '@/lib/movieFilterAuth';
import { getMoviePercents } from '@/lib/moviePercents';

export const dynamic = 'force-dynamic';

// STARŠIE verzie appky — teraz už hľadá v CELOM katalógu (predtým len
// v posledných 40/150 pridaných titulov). Nová appka používa /api/movie-filter.
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const spec = parseFilter(searchParams);
    if (!searchParams.get('sort')) spec.sort = spec.ratingFrom ? 'rating' : 'popular';
    const viewer = await filterViewer(req);
    if (!viewer.userId) return NextResponse.json({ error: 'Musíš být přihlášen.' }, { status: 401 });
    const r = await runFilter(spec, { ...viewer, pageSize: 40 });
    const percents = await getMoviePercents(r.items.map((m) => m.id));
    return NextResponse.json(
      r.items.map((m) => ({
        id: m.id,
        title: m.title,
        slug: m.slug,
        poster: m.poster,
        year: m.yearRaw,
        genres: m.genres.join(', '),
        countries: m.countries.join(', '),
        contentType: m.contentType,
        percent: (percents as any)[m.id]?.percent ?? m.percent,
        percentColor: (percents as any)[m.id]?.percentColor ?? null
      })),
      { headers: { 'Cache-Control': 'private, no-store' } }
    );
  } catch (error) {
    console.error('[api/mobile/filtered-movies]', error);
    return NextResponse.json({ error: 'Chyba při filtrování filmů.' }, { status: 500 });
  }
}
