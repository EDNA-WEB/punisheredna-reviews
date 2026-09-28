import { unstable_cache } from 'next/cache';
import { prisma } from './prisma';
import { computeBlendedPercent, scoreColorStyle } from './rating';

// Percento hodnotenia pre viac filmov naraz (plagáty v zoznamoch appky) —
// rovnaký výpočet ako profil filmu (computeBlendedPercent + farby webu).
// Jeden dopyt na celý zoznam, výsledok sa cachuje 5 minút, nech zoznamy
// na hlavnej obrazovke zbytočne nebudia databázu.
async function computePercents(ids: string[]) {
  if (ids.length === 0) return {} as Record<string, { percent: number | null; percentColor: string }>;
  const [movies, ratings] = await Promise.all([
    prisma.movie.findMany({ where: { id: { in: ids } }, select: { id: true, tmdbVoteAverage: true, tmdbVoteCount: true } }),
    prisma.rating.findMany({ where: { movieId: { in: ids }, seasonId: null, episodeId: null }, select: { movieId: true, value: true } })
  ]);
  const byMovie = new Map<string, { value: number }[]>();
  for (const r of ratings) {
    const list = byMovie.get(r.movieId) || [];
    list.push({ value: r.value });
    byMovie.set(r.movieId, list);
  }
  const out: Record<string, { percent: number | null; percentColor: string }> = {};
  for (const m of movies) {
    const percent = computeBlendedPercent(byMovie.get(m.id) || [], m.tmdbVoteAverage, m.tmdbVoteCount);
    out[m.id] = { percent, percentColor: scoreColorStyle(percent).backgroundColor };
  }
  return out;
}

export async function getMoviePercents(ids: string[]) {
  const unique = Array.from(new Set(ids)).sort();
  if (unique.length === 0) return {} as Record<string, { percent: number | null; percentColor: string }>;
  return unstable_cache(() => computePercents(unique), ['movie-percents', unique.join(',')], { revalidate: 300 })();
}

// Najbližší (alebo posledný) český kinový dátum premiéry pre viac filmov.
export async function getCzCinemaDates(ids: string[]) {
  if (ids.length === 0) return {} as Record<string, Date>;
  const rows = await prisma.moviePremiereDate.findMany({
    where: { movieId: { in: ids }, country: 'CZ', type: { not: 'VOD' } },
    orderBy: { releaseDate: 'asc' },
    select: { movieId: true, releaseDate: true }
  });
  const out: Record<string, Date> = {};
  for (const r of rows) if (!out[r.movieId]) out[r.movieId] = r.releaseDate;
  return out;
}
