import { unstable_cache } from 'next/cache';
import { prisma } from './prisma';
import { computeBlendedPercent } from './rating';
import { youtubeVideoId } from './markdown';

// ---------------------------------------------------------------------------
// Oblíbené mezi fanoušky — poradie dodáva bot (GitHub Actions, každých 20 h)
// cez /api/cron/fan-favorites. Chýbajúce tituly sa pri tom automaticky
// naimportujú z TMDb, takže sa zobrazuje celý zoznam zo zdroja.
// ---------------------------------------------------------------------------

export type FanFavoriteMovie = {
  rank: number;
  id: string;
  slug: string;
  title: string;
  year: string | null;
  poster: string | null;
  contentType: string;
  percent: number | null;
  trailerId: string | null;
};

export type FanFavoriteItem = FanFavoriteMovie & { inWatchlist: boolean; myRating: number };

export const FAN_ROW_LIMIT = 20;

const loadBase = unstable_cache(
  async (): Promise<{ items: FanFavoriteMovie[]; updatedAt: string | null }> => {
    const rows = await prisma.fanFavorite.findMany({
      where: { movieId: { not: null }, movie: { approved: true } },
      orderBy: { rank: 'asc' },
      take: 50,
      select: {
        updatedAt: true,
        movie: {
          select: {
            id: true,
            slug: true,
            title: true,
            year: true,
            poster: true,
            contentType: true,
            trailerUrl: true,
            tmdbVoteAverage: true,
            tmdbVoteCount: true,
            videos: {
              where: { category: 'trailer', seasonId: null, episodeId: null },
              orderBy: { createdAt: 'desc' },
              take: 1,
              select: { url: true }
            }
          }
        }
      }
    });
    const movies = rows.map((r) => r.movie).filter((m): m is NonNullable<typeof m> => !!m);
    const updatedAt = rows[0]?.updatedAt ? rows[0].updatedAt.toISOString() : null;
    if (!movies.length) return { items: [], updatedAt };

    const agg = await prisma.rating.groupBy({
      by: ['movieId'],
      where: { movieId: { in: movies.map((m) => m.id) }, seasonId: null, episodeId: null },
      _avg: { value: true },
      _count: { _all: true }
    });
    const stats = new Map(agg.map((a) => [a.movieId, { avg: a._avg.value || 0, count: a._count._all }]));

    const items = movies.map((m, index) => {
      const st = stats.get(m.id) || { avg: 0, count: 0 };
      // Priemer zopakovaný „počet“-krát dá rovnaký výsledok ako všetky hodnotenia.
      const values = Array.from({ length: st.count }, () => ({ value: st.avg }));
      const trailerUrl = m.videos[0]?.url || m.trailerUrl || null;
      return {
        rank: index + 1,
        id: m.id,
        slug: m.slug,
        title: m.title,
        year: m.year,
        poster: m.poster,
        contentType: m.contentType,
        percent: ((computeBlendedPercent(values as any, m.tmdbVoteAverage, m.tmdbVoteCount) as number | null) ?? null),
        trailerId: trailerUrl ? youtubeVideoId(trailerUrl) || null : null
      };
    });
    return { items, updatedAt };
  },
  ['fan-favorites-v2'],
  { revalidate: 1800, tags: ['fan-favorites'] }
);

export async function getFanFavorites(viewerId: string | null | undefined): Promise<{ items: FanFavoriteItem[]; updatedAt: string | null }> {
  try {
    const { items: base, updatedAt } = await loadBase();
    if (!base.length) return { items: [], updatedAt };
    if (!viewerId) return { items: base.map((m) => ({ ...m, inWatchlist: false, myRating: 0 })), updatedAt };
    const ids = base.map((m) => m.id);
    const [watch, mine] = await Promise.all([
      prisma.watchlistItem.findMany({ where: { userId: viewerId, movieId: { in: ids } }, select: { movieId: true } }),
      prisma.rating.findMany({ where: { userId: viewerId, movieId: { in: ids }, seasonId: null, episodeId: null }, select: { movieId: true, value: true } })
    ]);
    const inList = new Set(watch.map((w) => w.movieId));
    const myBy = new Map(mine.map((r) => [r.movieId, r.value]));
    return { items: base.map((m) => ({ ...m, inWatchlist: inList.has(m.id), myRating: myBy.get(m.id) || 0 })), updatedAt };
  } catch (error) {
    console.error('[fanFavorites]', error);
    return { items: [], updatedAt: null };
  }
}

// Záložné párovanie podľa názvu a roku (keď TMDb titul nenájde).
export function normalizeTitle(s: string) {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}
