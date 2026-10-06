import { unstable_cache } from 'next/cache';
import { prisma } from './prisma';
import { computeBlendedPercent } from './rating';

// ---------------------------------------------------------------------------
// Top 10 tento týden — poradie dodáva bot (GitHub Actions, raz za 24 h) cez
// /api/cron/top10. Chýbajúce tituly sa pri tom naimportujú z TMDb, takže sa
// zobrazí celý rebríček. Texty (český názov, dej) sú z našej databázy.
// ---------------------------------------------------------------------------

export type Top10Movie = {
  rank: number;
  id: string;
  slug: string;
  title: string;
  poster: string | null;
  contentType: string;
  year: string | null;
  releaseDate: string | null;
  runtime: number | null;
  episodes: number;
  ageRating: string | null;
  synopsis: string | null;
  percent: number | null;
};
export type Top10Item = Top10Movie & { inWatchlist: boolean; myRating: number; seen: boolean };

// Krátky dej do karty: najviac prvé 2 vety, vždy ukončené trojbodkou
// (ak sa v karte nezmestí ani to, prehliadač ho skráti tiež s trojbodkou).
function shortSynopsis(text: string | null) {
  if (!text) return null;
  const clean = text.replace(/\s+/g, ' ').trim();
  let out = clean.split(/(?<=[.!?…])\s+/).slice(0, 2).join(' ');
  if (out.length > 200) out = out.slice(0, 200).replace(/\s+\S*$/, '');
  return `${out.replace(/[\s.,;:!?…-]+$/, '')}…`;
}

const loadBase = unstable_cache(
  async (): Promise<{ items: Top10Movie[]; updatedAt: string | null }> => {
    const rows = await prisma.top10Entry.findMany({
      where: { movieId: { not: null }, movie: { approved: true } },
      orderBy: { rank: 'asc' },
      take: 10, // rebríček má až 15 titulov — zobrazí sa prvých 10, ktoré máme
      select: {
        updatedAt: true,
        movie: {
          select: {
            id: true,
            slug: true,
            title: true,
            poster: true,
            contentType: true,
            year: true,
            releaseDate: true,
            runtimeMinutes: true,
            ageRating: true,
            synopsis: true,
            tmdbVoteAverage: true,
            tmdbVoteCount: true
          }
        }
      }
    });
    const movies = rows.map((r) => r.movie).filter((m): m is NonNullable<typeof m> => !!m);
    const updatedAt = rows[0]?.updatedAt ? rows[0].updatedAt.toISOString() : null;
    if (!movies.length) return { items: [], updatedAt };
    const ids = movies.map((m) => m.id);

    const [agg, eps] = await Promise.all([
      prisma.rating.groupBy({
        by: ['movieId'],
        where: { movieId: { in: ids }, seasonId: null, episodeId: null },
        _avg: { value: true },
        _count: { _all: true }
      }),
      prisma.$queryRaw<{ movieId: string; n: bigint | number }[]>`
        SELECT s."movieId", COUNT(e.id) AS n FROM "Season" s JOIN "Episode" e ON e."seasonId" = s.id
        WHERE s."movieId" = ANY(${ids}) GROUP BY s."movieId"`
    ]);
    const stats = new Map(agg.map((a) => [a.movieId, { avg: a._avg.value || 0, count: a._count._all }]));
    const epBy = new Map(eps.map((e) => [e.movieId, Number(e.n)]));

    const items = movies.map((m, i) => {
      const st = stats.get(m.id) || { avg: 0, count: 0 };
      const values = Array.from({ length: st.count }, () => ({ value: st.avg }));
      return {
        rank: i + 1,
        id: m.id,
        slug: m.slug,
        title: m.title,
        poster: m.poster,
        contentType: m.contentType,
        year: m.year,
        releaseDate: m.releaseDate ? m.releaseDate.toISOString() : null,
        runtime: m.runtimeMinutes ?? null,
        episodes: epBy.get(m.id) || 0,
        ageRating: m.ageRating ?? null,
        synopsis: shortSynopsis(m.synopsis),
        percent: ((computeBlendedPercent(values as any, m.tmdbVoteAverage, m.tmdbVoteCount) as number | null) ?? null)
      };
    });
    return { items, updatedAt };
  },
  ['top10-v3'],
  { revalidate: 1800, tags: ['top10'] }
);

export async function getTop10(viewerId: string | null | undefined): Promise<{ items: Top10Item[]; updatedAt: string | null }> {
  try {
    const { items, updatedAt } = await loadBase();
    if (!items.length) return { items: [], updatedAt };
    if (!viewerId) return { items: items.map((m) => ({ ...m, inWatchlist: false, myRating: 0, seen: false })), updatedAt };
    const ids = items.map((m) => m.id);
    const [watch, mine, seen] = await Promise.all([
      prisma.watchlistItem.findMany({ where: { userId: viewerId, movieId: { in: ids } }, select: { movieId: true } }),
      prisma.rating.findMany({ where: { userId: viewerId, movieId: { in: ids }, seasonId: null, episodeId: null }, select: { movieId: true, value: true } }),
      prisma.seenMovie.findMany({ where: { userId: viewerId, movieId: { in: ids } }, select: { movieId: true } })
    ]);
    const w = new Set(watch.map((x) => x.movieId));
    const r = new Map(mine.map((x) => [x.movieId, x.value]));
    const s = new Set(seen.map((x) => x.movieId));
    return {
      items: items.map((m) => ({ ...m, inWatchlist: w.has(m.id), myRating: r.get(m.id) || 0, seen: s.has(m.id) || r.has(m.id) })),
      updatedAt
    };
  } catch (error) {
    console.error('[top10]', error);
    return { items: [], updatedAt: null };
  }
}
