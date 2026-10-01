import { NextResponse } from 'next/server';
import { activeFilterCount, parseFilter, runFilter, toListItem } from '@/lib/movieFilter';
import { filterViewer } from '@/lib/movieFilterAuth';
import { getMoviePercents } from '@/lib/moviePercents';

export const dynamic = 'force-dynamic';

// Nový filter filmov a seriálov (web aj appka).
// GET /api/movie-filter?genres=Komédia,Dráma&genresMode=all&yearFrom=1990&sort=rating&page=1&facets=1
// pageSize=0 → len počet výsledkov a počty pri voľbách (tlačidlo „Zobraziť 128 výsledkov“).
// random=1 → jeden náhodný tip z výsledkov („Neviem, čo pozerať“).
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const spec = parseFilter(searchParams);
    const viewer = await filterViewer(req);
    const pageSizeRaw = Number(searchParams.get('pageSize'));
    const pageSize = Number.isFinite(pageSizeRaw) && searchParams.get('pageSize') !== null ? Math.min(60, Math.max(0, pageSizeRaw)) : 24;

    const random = searchParams.get('random') === '1';
    const r = await runFilter(spec, { ...viewer, pageSize: random ? 1 : pageSize, withFacets: searchParams.get('facets') === '1', random });
    const colors = r.items.length ? await getMoviePercents(r.items.map((m) => m.id)) : {};

    return NextResponse.json(
      {
        total: r.total,
        page: r.page,
        pages: r.pages,
        limited: r.limited,
        activeCount: activeFilterCount(spec),
        sort: spec.sort,
        items: r.items.map((m) => ({ ...toListItem(m, r.userSets), percentColor: (colors as any)[m.id]?.percentColor ?? null })),
        facets: r.facets,
        similarTo: r.similarTo,
        didYouMean: r.didYouMean
      },
      { headers: { 'Cache-Control': 'private, no-store' } }
    );
  } catch (error) {
    console.error('[api/movie-filter]', error);
    return NextResponse.json({ error: 'Filtr se nepodařilo načíst.' }, { status: 500 });
  }
}
