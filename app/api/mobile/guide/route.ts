import { NextResponse } from 'next/server';
import { cdnHeaders } from '@/lib/memoCache';
import { getCachedKinoPremieres, getCachedVodPremieres } from '@/lib/cachedMovieData';
import { getMoviePercents } from '@/lib/moviePercents';

export const dynamic = 'force-dynamic';

// Průvodce v appke = webové stránky /kino a /vod. Rovnaké cachované dáta
// (getCachedKinoPremieres / getCachedVodPremieres, 10 min), rovnaké
// zoskupenie podľa dátumu premiéry. ?type=kino|vod&month=1-12&year=2026
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') === 'vod' ? 'vod' : 'kino';
    const now = new Date();
    const month = Math.min(12, Math.max(1, Number(searchParams.get('month')) || now.getMonth() + 1));
    const year = Number(searchParams.get('year')) || now.getFullYear();

    const rangeStart = new Date(year, month - 1, 1).toISOString();
    const rangeEnd = new Date(year, month, 1).toISOString();
    const { movies, people } =
      type === 'vod' ? await getCachedVodPremieres(rangeStart, rangeEnd) : await getCachedKinoPremieres(rangeStart, rangeEnd);

    const slugByName = new Map(people.map((p: any) => [p.name, p.slug]));
    const percents = await getMoviePercents((movies as any[]).map((m) => m.id));
    const split = (v: string | null) => (v || '').split(',').map((x) => x.trim()).filter(Boolean);
    const withSlug = (name: string) => ({ name, slug: slugByName.get(name) || null });

    const groups = new Map<string, any[]>();
    for (const m of movies as any[]) {
      if (!m.releaseDate) continue;
      const key = new Date(m.releaseDate).toISOString().slice(0, 10);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push({
        id: m.id,
        slug: m.slug,
        title: m.title,
        year: m.year,
        poster: m.poster,
        contentType: m.contentType,
        countries: m.countries,
        genres: split(m.genres).slice(0, 3),
        director: split(m.director).map(withSlug),
        cast: split(m.cast).slice(0, 3).map(withSlug),
        nowShowing: !!m.nowShowing,
        percent: percents[m.id]?.percent ?? null,
        percentColor: percents[m.id]?.percentColor ?? null
      });
    }

    const days = Array.from(groups.keys())
      .sort()
      .map((date) => ({ date, movies: groups.get(date) }));

    return NextResponse.json({ type, month, year, days, total: (movies as any[]).length }, { status: 200, headers: cdnHeaders(600) });
  } catch (error) {
    console.error('[api/mobile/guide]', error);
    return NextResponse.json({ error: 'Chyba při načítání průvodce.' }, { status: 500 });
  }
}
