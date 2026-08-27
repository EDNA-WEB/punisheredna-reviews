import { prisma } from './prisma';
import { computePercent } from './rating';

// Vypočíta pre daného používateľa "Odporúčame pre teba" — filmy/seriály,
// čo zodpovedajú žánrom, ktoré mu doteraz na základe VLASTNÝCH hodnotení
// naozaj chutili (bral do úvahy len hodnotenia 4★ a vyššie), a ktoré ešte
// sám neohodnotil. Ak používateľ nemá dostatok hodnotení na to, aby sa dal
// odhadnúť vkus (menej ako 3), vráti prázdne pole — radšej nič, než náhodný odhad.
export async function getRecommendationsForUser(userId: string, limit = 8) {
  const myRatings = await prisma.rating.findMany({
    where: { userId, seasonId: null, episodeId: null, value: { gte: 4 } },
    select: { movieId: true },
    orderBy: { createdAt: 'desc' },
    take: 50
  });

  if (myRatings.length < 3) return { movies: [], topGenres: [] as string[] };

  const likedMovies = await prisma.movie.findMany({
    where: { id: { in: myRatings.map((r) => r.movieId) } },
    select: { genres: true }
  });

  const genreCounts = new Map<string, number>();
  for (const m of likedMovies) {
    (m.genres || '').split(',').map((g) => g.trim()).filter(Boolean).forEach((g) => {
      genreCounts.set(g, (genreCounts.get(g) || 0) + 1);
    });
  }
  const topGenres = Array.from(genreCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([g]) => g);

  if (topGenres.length === 0) return { movies: [], topGenres: [] };

  const alreadyRatedIds = new Set(
    (await prisma.rating.findMany({ where: { userId, seasonId: null, episodeId: null }, select: { movieId: true } })).map((r) => r.movieId)
  );

  const candidates = await prisma.movie.findMany({
    where: {
      approved: true,
      id: { notIn: Array.from(alreadyRatedIds) },
      OR: topGenres.map((g) => ({ genres: { contains: g, mode: 'insensitive' as const } }))
    },
    include: { ratings: { where: { seasonId: null, episodeId: null } } },
    take: 200
  });

  const scored = candidates
    .map((m) => {
      const movieGenres = (m.genres || '').split(',').map((g) => g.trim());
      const matchCount = topGenres.filter((g) => movieGenres.includes(g)).length;
      const percent = computePercent(m.ratings);
      return { ...m, percent, matchCount };
    })
    .filter((m) => m.percent !== null && m.ratings.length >= 3)
    .sort((a, b) => b.matchCount - a.matchCount || (b.percent as number) - (a.percent as number))
    .slice(0, limit);

  return { movies: scored, topGenres };
}
