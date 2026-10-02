import { prisma } from './prisma';

// ---------------------------------------------------------------------------
// Nedávno prohlížené — spoločná história pre web aj appku (uložená k účtu).
// Drží sa najviac RECENT_LIMIT titulov; ten istý film sa neopakuje, pri ďalšom
// otvorení sa len presunie na začiatok.
// ---------------------------------------------------------------------------

export const RECENT_LIMIT = 7;

export type RecentlyViewedItem = {
  id: string;
  title: string;
  slug: string;
  poster: string | null;
  year: string | null;
  inWatchlist: boolean;
};

export async function recordRecentView(userId: string, movieId: string) {
  const now = new Date();
  await prisma.recentlyViewed.upsert({
    where: { userId_movieId: { userId, movieId } },
    create: { userId, movieId, viewedAt: now },
    update: { viewedAt: now }
  });
  // Staršie než prvých 7 zmazať — história nerastie donekonečna.
  const overflow = await prisma.recentlyViewed.findMany({
    where: { userId },
    orderBy: { viewedAt: 'desc' },
    skip: RECENT_LIMIT,
    select: { id: true }
  });
  if (overflow.length) {
    await prisma.recentlyViewed.deleteMany({ where: { id: { in: overflow.map((o) => o.id) } } });
  }
}

export async function getRecentlyViewed(userId: string): Promise<RecentlyViewedItem[]> {
  const rows = await prisma.recentlyViewed.findMany({
    where: { userId, movie: { approved: true } },
    orderBy: { viewedAt: 'desc' },
    take: RECENT_LIMIT,
    select: { movie: { select: { id: true, title: true, slug: true, poster: true, year: true } } }
  });
  if (!rows.length) return [];
  const ids = rows.map((r) => r.movie.id);
  const watch = await prisma.watchlistItem.findMany({
    where: { userId, movieId: { in: ids } },
    select: { movieId: true }
  });
  const inList = new Set(watch.map((w) => w.movieId));
  return rows.map((r) => ({ ...r.movie, inWatchlist: inList.has(r.movie.id) }));
}

export async function clearRecentlyViewed(userId: string) {
  await prisma.recentlyViewed.deleteMany({ where: { userId } });
}

// Bezpečná verzia pre stránky: ak by tabuľka ešte neexistovala alebo nastala
// chyba, stránka sa nezrúti — sekcia sa len nezobrazí.
export async function getRecentlyViewedSafe(userId: string | null | undefined): Promise<RecentlyViewedItem[]> {
  if (!userId) return [];
  try {
    return await getRecentlyViewed(userId);
  } catch (error) {
    console.error('[recentlyViewed]', error);
    return [];
  }
}
