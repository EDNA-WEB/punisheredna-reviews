import { computePercent } from './rating';
import type { FilmographyCategory } from './personFilmography';

// Výpočty pre nový profil osobnosti (app/osobnost/[slug]/page.tsx a
// /api/mobile/person-profile): kariéra v číslach, žánre, rola pri filme.

export type CareerBar = { label: string; from: number; count: number };
export type CareerStats = {
  bars: CareerBar[];
  firstYear: number | null;
  lastYear: number | null;
  busiestYear: { year: number; count: number } | null;
  topGenre: { genre: string; percent: number } | null;
  bestDecade: { label: string; percent: number } | null;
  total: number;
};

type OurMovie = { year: string | null; genres?: string | null; ratings: { value: number }[] };

// Unikátne tituly celej filmografie s rokom (z TMDb kategórií)
export function filmographyYears(categories: FilmographyCategory[] | null, earliest: number): { tmdbId: number; year: number }[] {
  const seen = new Map<number, number>();
  for (const c of categories || []) {
    for (const it of c.items) {
      const y = parseInt(it.year || '', 10);
      if (isNaN(y) || y < earliest || seen.has(it.tmdbId)) continue;
      seen.set(it.tmdbId, y);
    }
  }
  return Array.from(seen.entries()).map(([tmdbId, year]) => ({ tmdbId, year }));
}

export function genreShare(movies: OurMovie[], limit = 5): { genre: string; percent: number }[] {
  const map = new Map<string, number>();
  for (const m of movies) {
    for (const g of (m.genres || '').split(',').map((x) => x.trim()).filter(Boolean)) map.set(g, (map.get(g) || 0) + 1);
  }
  const total = Array.from(map.values()).reduce((a, b) => a + b, 0) || 1;
  return Array.from(map.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([genre, n]) => ({ genre, percent: Math.round((n / total) * 100) }));
}

export function careerStats(categories: FilmographyCategory[] | null, ourMovies: OurMovie[], earliest: number, lastYearCap?: number): CareerStats {
  const thisYear = new Date().getFullYear();
  const titles = filmographyYears(categories, earliest).filter((t) => t.year <= (lastYearCap ?? thisYear + 3));
  // Ak TMDb filmografiu nemáme, použijeme aspoň filmy u nás
  const years = titles.length
    ? titles.map((t) => t.year)
    : ourMovies.map((m) => parseInt(m.year || '', 10)).filter((y) => !isNaN(y) && y >= earliest);

  const genres = genreShare(ourMovies, 1);

  // Najlepšie hodnotené desaťročie (aspoň 2 filmy u nás s hodnotením)
  const byDecade = new Map<number, number[]>();
  for (const m of ourMovies) {
    const y = parseInt(m.year || '', 10);
    const p = computePercent(m.ratings);
    if (isNaN(y) || p === null) continue;
    const d = Math.floor(y / 10) * 10;
    if (!byDecade.has(d)) byDecade.set(d, []);
    byDecade.get(d)!.push(p);
  }
  let bestDecade: CareerStats['bestDecade'] = null;
  for (const [d, list] of byDecade) {
    if (list.length < 2) continue;
    const avg = Math.round(list.reduce((a, b) => a + b, 0) / list.length);
    if (!bestDecade || avg > bestDecade.percent) bestDecade = { label: `${d}–${d + 9}`, percent: avg };
  }

  if (!years.length) return { bars: [], firstYear: null, lastYear: null, busiestYear: null, topGenre: genres[0] || null, bestDecade, total: 0 };

  const counts = new Map<number, number>();
  for (const y of years) counts.set(y, (counts.get(y) || 0) + 1);
  const firstYear = Math.min(...years);
  const lastYear = Math.max(...years);
  let busiestYear: CareerStats['busiestYear'] = null;
  for (const [year, count] of counts) if (!busiestYear || count > busiestYear.count || (count === busiestYear.count && year > busiestYear.year)) busiestYear = { year, count };

  // Najviac ~30 stĺpcov — pri dlhej kariére sa roky zlúčia do skupín
  const span = lastYear - firstYear + 1;
  const step = Math.max(1, Math.ceil(span / 30));
  const bars: CareerBar[] = [];
  for (let from = firstYear; from <= lastYear; from += step) {
    let count = 0;
    for (let y = from; y < from + step; y++) count += counts.get(y) || 0;
    bars.push({ from, count, label: step === 1 ? String(from) : `${from}–${Math.min(lastYear, from + step - 1)}` });
  }
  return { bars, firstYear, lastYear, busiestYear, topGenre: genres[0] || null, bestDecade, total: years.length };
}

// Funkcia tvorcu pri filme (podľa toho, v ktorom poli filmu je jeho meno)
export function creatorJob(
  name: string,
  movie: { director?: string | null; screenplay?: string | null; cinematography?: string | null; music?: string | null },
  labels: { director: string; screenplay: string; cinematography: string; music: string }
): string | null {
  const has = (field?: string | null) => !!field && field.toLowerCase().split(',').some((x) => x.trim() === name.toLowerCase());
  const loose = (field?: string | null) => !!field && field.toLowerCase().includes(name.toLowerCase());
  const jobs: string[] = [];
  if (has(movie.director) || (!jobs.length && loose(movie.director))) jobs.push(labels.director);
  if (has(movie.screenplay) || loose(movie.screenplay)) jobs.push(labels.screenplay);
  if (has(movie.cinematography) || loose(movie.cinematography)) jobs.push(labels.cinematography);
  if (has(movie.music) || loose(movie.music)) jobs.push(labels.music);
  return jobs.length ? Array.from(new Set(jobs)).slice(0, 2).join(', ') : null;
}

// Kto sa smie ukázať medzi fanúšikmi osobnosti: nie zmazaní/zablokovaní
// a len tí, čo obľúbené nemajú skryté (rovnaké pravidlo ako na profile).
export function visibleFanFilter(viewerId: string | null) {
  return {
    deleted: false,
    banned: false,
    OR: [
      { favoritesVisibility: 'EVERYONE' },
      ...(viewerId ? [{ favoritesVisibility: 'LOGGED_IN' }, { favoritesVisibility: 'ONLY_FAVORITES', following: { some: { followingId: viewerId } } }] : [])
    ]
  };
}
