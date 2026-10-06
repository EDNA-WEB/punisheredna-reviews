import { unstable_cache } from 'next/cache';
import { prisma } from './prisma';
import { memo } from './memoCache';
import { computeBlendedPercent } from './rating';

// ---------------------------------------------------------------------------
// FILTER FILMOV A SERIÁLOV — jedno spoločné jadro pre web aj appku.
//
// Celý katalóg (len stĺpce potrebné na filtrovanie) sa raz za 5 minút načíta
// do pamäte servera a každé ďalšie filtrovanie prebehne v pamäti — okamžite
// a BEZ ďalších dopytov do Neonu, nech je filtrov koľkokoľvek. Filtruje sa
// vždy CELÝ katalóg (nie len posledných pár desiatok titulov ako predtým).
//
// Text a mená sa porovnávajú bez ohľadu na veľké písmená a diakritiku
// („pan prstenov“ = „Pán prsteňov“, „zelenka“ = „Želenka“).
// ---------------------------------------------------------------------------

const CATALOG_TTL = 15 * 60 * 1000;

// Súčty (hodnotenia, recenzie, fotky, videá, zaujímavosti) — 5 agregovaných
// dopytov namiesto ťahania tisícov riadkov hodnotení. Výsledok je malý, preto
// ho zdieľajú všetky inštancie servera (cache na 15 min), nie každá zvlášť.
const getCatalogAggregates = unstable_cache(
  async () => {
    const [ratings, reviews, photos, videos, trivia] = await Promise.all([
      prisma.rating.groupBy({ by: ['movieId'], where: { seasonId: null, episodeId: null }, _avg: { value: true }, _count: { _all: true } }),
      prisma.review.groupBy({ by: ['movieId'], where: { seasonId: null, episodeId: null }, _count: { _all: true } }),
      prisma.moviePhoto.groupBy({ by: ['movieId'], _count: { _all: true } }),
      prisma.movieVideo.groupBy({ by: ['movieId'], _count: { _all: true } }),
      prisma.movieTrivia.groupBy({ by: ['movieId'], _count: { _all: true } })
    ]);
    const out: Record<string, [number, number, number, number, number, number]> = {};
    const row = (id: string) => (out[id] ||= [0, 0, 0, 0, 0, 0]);
    for (const r of ratings) {
      const x = row(r.movieId);
      x[0] = r._avg.value ?? 0;
      x[1] = r._count._all;
    }
    for (const r of reviews) row(r.movieId)[2] = r._count._all;
    for (const r of photos) row(r.movieId)[3] = r._count._all;
    for (const r of videos) row(r.movieId)[4] = r._count._all;
    for (const r of trivia) row(r.movieId)[5] = r._count._all;
    return out;
  },
  ['movie-filter-aggregates-v1'],
  { revalidate: 900, tags: ['movie-filter'] }
);
export const PAGE_SIZE = 24;
export const MAX_FREE_PAGE = 5; // neplatiaci: max. 5 stránok (ako doteraz)

export function fold(s: unknown): string {
  return String(s ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function splitList(s: string | null | undefined): string[] {
  return (s || '')
    .split(',')
    .map((x) => x.replace(/\(.*?\)/g, '').trim())
    .filter(Boolean);
}

export type CatalogMovie = {
  id: string;
  title: string;
  originalTitle: string | null;
  slug: string;
  poster: string | null;
  year: number | null;
  yearRaw: string | null;
  contentType: string;
  genres: string[];
  countries: string[];
  runtime: number | null;
  directors: string[];
  cast: string[];
  writers: string[];
  camera: string[];
  music: string[];
  tags: string[];
  services: string[];
  hasSubtitles: boolean;
  hasDubbing: boolean;
  nowShowing: boolean;
  online: boolean;
  isCamVersion: boolean;
  releaseDate: string | null;
  createdAt: number;
  popularity: number;
  percent: number | null;
  votes: number;
  ratingCount: number;
  ratingAvg: number;
  boxOffice: number;
  reviews: number;
  photos: number;
  videos: number;
  trivia: number;
  premiereType: string | null;
  // predpočítané „zložené“ texty na rýchle porovnanie
  fTitle: string;
  fDirectors: string;
  fCast: string;
  fWriters: string;
  fCamera: string;
  fMusic: string;
  fTags: string[];
};

// Výkon: katalóg je príliš veľký na jednu položku zdieľanej cache (limit
// 2 MB), preto sa ukladá po častiach. Inštancia servera si ho tak poskladá
// z cache za zlomok sekundy namiesto ťahania celej filmotéky z databázy.
const CATALOG_CHUNK = 250;

const getCatalogCount = unstable_cache(
  () => prisma.movie.count({ where: { approved: true } }),
  ['movie-filter-count-v1'],
  { revalidate: 900, tags: ['movie-filter'] }
);

const getCatalogChunk = unstable_cache(
  async (index: number) => {
    const rows = await prisma.movie.findMany({
      where: { approved: true },
      orderBy: { id: 'asc' },
      skip: index * CATALOG_CHUNK,
      take: CATALOG_CHUNK,
      select: {
      id: true,
      title: true,
      originalTitle: true,
      slug: true,
      poster: true,
      year: true,
      contentType: true,
      genres: true,
      countries: true,
      runtimeMinutes: true,
      director: true,
      cast: true,
      screenplay: true,
      cinematography: true,
      music: true,
      tags: true,
      hasSubtitles: true,
      hasDubbing: true,
      nowShowing: true,
      watchUrl: true,
      isCamVersion: true,
      releaseDate: true,
      createdAt: true,
      tmdbPopularity: true,
      tmdbVoteAverage: true,
      tmdbVoteCount: true,
      boxOffice: true,
      streamingServices: { select: { streamingServiceId: true } },
      keywords: { select: { name: true } },
      premiereDates: { orderBy: { releaseDate: 'asc' }, take: 1, select: { type: true } }
    }
    });
    return rows.map((m) => ({
      ...m,
      releaseDate: m.releaseDate ? new Date(m.releaseDate).toISOString() : null,
      createdAt: new Date(m.createdAt).getTime(),
      boxOffice: m.boxOffice ? Number(m.boxOffice) : 0
    }));
  },
  ['movie-filter-chunk-v1'],
  { revalidate: 900, tags: ['movie-filter'] }
);

async function loadCatalog(): Promise<CatalogMovie[]> {
  const [total, agg] = await Promise.all([getCatalogCount(), getCatalogAggregates()]);
  // +1 časť navyše pre filmy pridané od posledného spočítania.
  const chunkCount = Math.ceil(total / CATALOG_CHUNK) + 1;
  const chunks = await Promise.all(Array.from({ length: chunkCount }, (_, i) => getCatalogChunk(i)));
  const seen = new Set<string>();
  const rows = chunks.flat().filter((m) => {
    if (seen.has(m.id)) return false;
    seen.add(m.id);
    return true;
  });

  return rows.map((m) => {
    const yearNum = m.year ? parseInt(m.year, 10) : NaN;
    const directors = splitList(m.director);
    const cast = splitList(m.cast);
    const writers = splitList(m.screenplay);
    const camera = splitList(m.cinematography);
    const music = splitList(m.music);
    const tags = Array.from(new Set([...splitList(m.tags), ...m.keywords.map((k) => k.name.trim()).filter(Boolean)]));
    const services = m.streamingServices.map((s) => s.streamingServiceId);
    const a = agg[m.id] || [0, 0, 0, 0, 0, 0];
    // computeBlendedPercent pracuje s jednotlivými hodnoteniami — priemer
    // zopakovaný „počet“-krát dá rovnaký výsledok bez ťahania všetkých riadkov.
    const ratingValues = a[1] ? Array.from({ length: a[1] }, () => ({ value: a[0] })) : [];
    return {
      id: m.id,
      title: m.title,
      originalTitle: m.originalTitle,
      slug: m.slug,
      poster: m.poster,
      year: Number.isFinite(yearNum) ? yearNum : null,
      yearRaw: m.year,
      contentType: m.contentType,
      genres: splitList(m.genres),
      countries: splitList(m.countries),
      runtime: m.runtimeMinutes ?? null,
      directors,
      cast,
      writers,
      camera,
      music,
      tags,
      services,
      hasSubtitles: m.hasSubtitles,
      hasDubbing: m.hasDubbing,
      nowShowing: m.nowShowing,
      online: !!m.watchUrl || services.length > 0,
      isCamVersion: m.isCamVersion,
      releaseDate: m.releaseDate,
      createdAt: m.createdAt,
      popularity: m.tmdbPopularity || 0,
      percent: computeBlendedPercent(ratingValues, m.tmdbVoteAverage, m.tmdbVoteCount) ?? null,
      votes: a[1] + (m.tmdbVoteCount || 0),
      ratingCount: a[1],
      ratingAvg: a[0],
      boxOffice: m.boxOffice ? Number(m.boxOffice) : 0,
      reviews: a[2],
      photos: a[3],
      videos: a[4],
      trivia: a[5],
      premiereType: m.premiereDates[0]?.type || null,
      fTitle: fold(`${m.title} ${m.originalTitle || ''}`),
      fDirectors: fold(directors.join('|')),
      fCast: fold(cast.join('|')),
      fWriters: fold(writers.join('|')),
      fCamera: fold(camera.join('|')),
      fMusic: fold(music.join('|')),
      fTags: tags.map(fold)
    };
  });
}

export function getFilterCatalog() {
  return memo('movieFilter:catalog', CATALOG_TTL, loadCatalog);
}

// --- Parametre filtra --------------------------------------------------------

export type SortKey =
  | 'popular'
  | 'rating'
  | 'worst'
  | 'newest'
  | 'oldest'
  | 'az'
  | 'za'
  | 'reviews'
  | 'added'
  | 'boxoffice'
  | 'longest'
  | 'shortest'
  | 'similar';

export const SORTS: SortKey[] = ['popular', 'rating', 'worst', 'newest', 'oldest', 'az', 'za', 'reviews', 'added', 'boxoffice', 'longest', 'shortest', 'similar'];

export type FilterSpec = {
  q: string;
  types: string[];
  genres: string[];
  genresMode: 'any' | 'all';
  exGenres: string[];
  countries: string[];
  exCountries: string[];
  yearFrom: number | null;
  yearTo: number | null;
  lenFrom: number | null;
  lenTo: number | null;
  ratingFrom: number | null;
  ratingTo: number | null;
  minVotes: number | null;
  services: string[];
  cinema: boolean;
  online: boolean;
  subs: boolean;
  dub: boolean;
  director: string;
  actors: string[];
  writer: string;
  camera: string;
  music: string;
  keywords: string[];
  hideSeen: boolean;
  onlySeen: boolean;
  onlyWatchlist: boolean;
  hasReviews: boolean;
  hasGallery: boolean;
  hasVideos: boolean;
  hasTrivia: boolean;
  maxVotes: number | null; // „skryté perly“ — málo známe
  addedDays: number | null; // pridané na web za posledných X dní
  upcoming: boolean; // premiéra ešte len bude
  noCam: boolean; // bez CAM verzií
  similar: string; // id alebo slug filmu — „Podobné ako…“
  countriesMode: 'any' | 'primary' | 'secondary'; // primary = hlavná krajina pôvodu (domáca tvorba), secondary = len koprodukcia / natáčanie (stopa)
  sort: SortKey;
  page: number;
};

type ParamSource = { get(name: string): string | null };

const OLD_SORTS: Record<string, SortKey> = {
  najnovsie: 'newest',
  najstarsie: 'oldest',
  'najnovsie-pridane': 'added',
  najlepsie: 'rating',
  najhorsie: 'worst'
};

function list(p: ParamSource, ...names: string[]) {
  const out: string[] = [];
  for (const n of names) {
    const v = p.get(n);
    if (v) v.split(',').forEach((x) => x.trim() && out.push(x.trim().slice(0, 80)));
  }
  return Array.from(new Set(out)).slice(0, 40);
}

function num(p: ParamSource, name: string, min: number, max: number) {
  const v = p.get(name);
  if (v === null || v === '') return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return Math.min(max, Math.max(min, Math.round(n)));
}

function flag(p: ParamSource, name: string) {
  const v = p.get(name);
  return v === '1' || v === 'true';
}

function text(p: ParamSource, name: string) {
  return (p.get(name) || '').trim().slice(0, 80);
}

// Prijme aj STARÉ parametre (genre, country, tag, minLength, nowShowing,
// minRating, actor, sort=najnovsie…), aby fungovali staré odkazy aj staré verzie appky.
export function parseFilter(p: ParamSource): FilterSpec {
  const sortRaw = p.get('sort') || '';
  const sort: SortKey = (SORTS as string[]).includes(sortRaw) ? (sortRaw as SortKey) : OLD_SORTS[sortRaw] || 'popular';
  return {
    q: text(p, 'q'),
    types: list(p, 'types', 'type'),
    genres: list(p, 'genres', 'genre'),
    genresMode: p.get('genresMode') === 'all' ? 'all' : 'any',
    exGenres: list(p, 'exGenres'),
    countries: list(p, 'countries', 'country'),
    exCountries: list(p, 'exCountries'),
    yearFrom: num(p, 'yearFrom', 1880, 2100),
    yearTo: num(p, 'yearTo', 1880, 2100),
    lenFrom: num(p, 'lenFrom', 0, 1000) ?? num(p, 'minLength', 0, 1000),
    lenTo: num(p, 'lenTo', 0, 1000) ?? num(p, 'maxLength', 0, 1000),
    ratingFrom: num(p, 'ratingFrom', 0, 100) ?? (num(p, 'minRating', 0, 100) || null),
    ratingTo: num(p, 'ratingTo', 0, 100),
    minVotes: num(p, 'minVotes', 0, 10_000_000),
    services: list(p, 'services'),
    cinema: flag(p, 'cinema') || flag(p, 'nowShowing'),
    online: flag(p, 'online'),
    subs: flag(p, 'subs'),
    dub: flag(p, 'dub'),
    director: text(p, 'director'),
    actors: list(p, 'actors', 'actor'),
    writer: text(p, 'writer') || text(p, 'screenplay'),
    camera: text(p, 'camera') || text(p, 'cinematography'),
    music: text(p, 'music'),
    keywords: list(p, 'keywords', 'tags', 'tag'),
    hideSeen: flag(p, 'hideSeen'),
    onlySeen: flag(p, 'onlySeen'),
    onlyWatchlist: flag(p, 'onlyWatchlist'),
    hasReviews: flag(p, 'hasReviews'),
    hasGallery: flag(p, 'hasGallery'),
    hasVideos: flag(p, 'hasVideos'),
    hasTrivia: flag(p, 'hasTrivia'),
    maxVotes: num(p, 'maxVotes', 0, 100_000_000),
    addedDays: num(p, 'addedDays', 1, 3650),
    upcoming: flag(p, 'upcoming'),
    noCam: flag(p, 'noCam'),
    similar: text(p, 'similar'),
    countriesMode: p.get('countriesMode') === 'primary' ? 'primary' : p.get('countriesMode') === 'secondary' ? 'secondary' : 'any',
    sort,
    page: Math.max(1, num(p, 'page', 1, 100000) || 1)
  };
}

// Počet aktívnych filtrov (bez zoradenia a stránky) — pre odznak „Filtre (3)“.
export function activeFilterCount(f: FilterSpec) {
  let n = 0;
  if (f.q.length >= 2) n++;
  n += f.types.length ? 1 : 0;
  n += f.genres.length ? 1 : 0;
  n += f.exGenres.length ? 1 : 0;
  n += f.countries.length ? 1 : 0;
  n += f.exCountries.length ? 1 : 0;
  n += f.yearFrom !== null || f.yearTo !== null ? 1 : 0;
  n += f.lenFrom !== null || f.lenTo !== null ? 1 : 0;
  n += f.ratingFrom !== null || f.ratingTo !== null ? 1 : 0;
  n += f.minVotes ? 1 : 0;
  n += f.services.length ? 1 : 0;
  n += [f.cinema, f.online, f.subs, f.dub, f.hideSeen, f.onlySeen, f.onlyWatchlist, f.hasReviews, f.hasGallery, f.hasVideos, f.hasTrivia, f.upcoming, f.noCam].filter(Boolean).length;
  n += (f.maxVotes ? 1 : 0) + (f.addedDays ? 1 : 0) + (f.similar ? 1 : 0);
  n += [f.director, f.writer, f.camera, f.music].filter(Boolean).length + (f.actors.length ? 1 : 0);
  n += f.keywords.length ? 1 : 0;
  return n;
}

// --- Osobné údaje (len ak treba) --------------------------------------------

export type UserSets = { seen: Set<string>; watchlist: Set<string>; seenThisYear?: Set<string> };

export async function getUserSets(userId: string | null): Promise<UserSets> {
  if (!userId) return { seen: new Set(), watchlist: new Set() };
  return memo(`movieFilter:user:${userId}`, 60 * 1000, async () => {
    const [rated, reviewed, watch, listItems] = await Promise.all([
      prisma.rating.findMany({ where: { userId, seasonId: null, episodeId: null }, select: { movieId: true, createdAt: true } }),
      prisma.review.findMany({ where: { authorId: userId, seasonId: null, episodeId: null }, select: { movieId: true, createdAt: true } }),
      prisma.watchlistItem.findMany({ where: { userId }, select: { movieId: true } }),
      prisma.movieListItem.findMany({ where: { list: { authorId: userId, title: 'Chcem vidieť' } }, select: { movieId: true } })
    ]);
    const yearStart = new Date(new Date().getFullYear(), 0, 1).getTime();
    return {
      seen: new Set([...rated, ...reviewed].map((r) => r.movieId)),
      // videné (ohodnotené / zrecenzované) od 1. januára tohto roka
      seenThisYear: new Set([...rated, ...reviewed].filter((r) => r.createdAt.getTime() >= yearStart).map((r) => r.movieId)),
      watchlist: new Set([...watch, ...listItems].map((r) => r.movieId))
    };
  });
}

// --- Samotné filtrovanie -----------------------------------------------------

type Skip = { types?: boolean; genres?: boolean; countries?: boolean; services?: boolean };

function matches(m: CatalogMovie, f: FilterSpec, u: UserSets, nowMs: number, isMember: boolean, skip: Skip = {}) {
  // Neplatiaci vidia nový titul až 2 h po pridaní (ako doteraz)
  if (!isMember && m.createdAt > nowMs - 2 * 60 * 60 * 1000) return false;

  if (f.q.length >= 2) {
    const words = fold(f.q).split(/\s+/).filter(Boolean);
    if (!words.every((w) => m.fTitle.includes(w))) return false;
  }
  if (!skip.types && f.types.length && !f.types.includes(m.contentType)) return false;

  if (!skip.genres && f.genres.length) {
    const ok = f.genresMode === 'all' ? f.genres.every((g) => m.genres.includes(g)) : f.genres.some((g) => m.genres.includes(g));
    if (!ok) return false;
  }
  if (f.exGenres.length && f.exGenres.some((g) => m.genres.includes(g))) return false;
  if (!skip.countries && f.countries.length) {
    // „primary“ = film MUSÍ byť hlavne z danej krajiny (prvá uvedená krajina
    // pôvodu) — odlíši domácu tvorbu od zahraničných filmov len natáčaných u nás
    const primary = !!m.countries[0] && f.countries.includes(m.countries[0]);
    const anyOf = f.countries.some((c) => m.countries.includes(c));
    const ok = f.countriesMode === 'primary' ? primary : f.countriesMode === 'secondary' ? anyOf && !primary : anyOf;
    if (!ok) return false;
  }
  if (f.exCountries.length && f.exCountries.some((c) => m.countries.includes(c))) return false;

  if (f.yearFrom !== null && (m.year === null || m.year < f.yearFrom)) return false;
  if (f.yearTo !== null && (m.year === null || m.year > f.yearTo)) return false;
  if (f.lenFrom !== null && (m.runtime === null || m.runtime < f.lenFrom)) return false;
  if (f.lenTo !== null && (m.runtime === null || m.runtime > f.lenTo)) return false;
  if (f.ratingFrom !== null && (m.percent === null || m.percent < f.ratingFrom)) return false;
  if (f.ratingTo !== null && (m.percent === null || m.percent > f.ratingTo)) return false;
  if (f.minVotes && m.votes < f.minVotes) return false;

  if (!skip.services && f.services.length && !f.services.some((s) => m.services.includes(s))) return false;
  if (f.cinema && !m.nowShowing) return false;
  if (f.online && !m.online) return false;
  if (f.subs && !m.hasSubtitles) return false;
  if (f.dub && !m.hasDubbing) return false;

  if (f.director && !m.fDirectors.includes(fold(f.director))) return false;
  if (f.actors.length && !f.actors.every((a) => m.fCast.includes(fold(a)))) return false;
  if (f.writer && !m.fWriters.includes(fold(f.writer))) return false;
  if (f.camera && !m.fCamera.includes(fold(f.camera))) return false;
  if (f.music && !m.fMusic.includes(fold(f.music))) return false;
  if (f.keywords.length && !f.keywords.every((k) => m.fTags.some((t) => t.includes(fold(k))))) return false;

  if (f.hideSeen && u.seen.has(m.id)) return false;
  if (f.onlySeen && !u.seen.has(m.id)) return false;
  if (f.onlyWatchlist && !u.watchlist.has(m.id)) return false;

  if (f.hasReviews && m.reviews === 0) return false;
  if (f.hasGallery && m.photos === 0) return false;
  if (f.hasVideos && m.videos === 0) return false;
  if (f.hasTrivia && m.trivia === 0) return false;
  if (f.maxVotes && m.votes > f.maxVotes) return false;
  if (f.addedDays && m.createdAt < nowMs - f.addedDays * 86400000) return false;
  if (f.upcoming && !(m.releaseDate && new Date(m.releaseDate).getTime() > nowMs)) return false;
  if (f.noCam && m.isCamVersion) return false;
  return true;
}

const collator = new Intl.Collator('cs', { sensitivity: 'base' });

function releaseKey(m: CatalogMovie) {
  if (m.releaseDate) return new Date(m.releaseDate).getTime();
  return m.year ? Date.UTC(m.year, 0, 1) : -Infinity;
}

function sortMovies(list: CatalogMovie[], sort: SortKey) {
  const byPop = (a: CatalogMovie, b: CatalogMovie) => b.popularity - a.popularity || b.votes - a.votes;
  const cmp: Record<SortKey, (a: CatalogMovie, b: CatalogMovie) => number> = {
    popular: byPop,
    rating: (a, b) => (b.percent ?? -1) - (a.percent ?? -1) || b.votes - a.votes,
    worst: (a, b) => (a.percent ?? 101) - (b.percent ?? 101) || b.votes - a.votes,
    newest: (a, b) => releaseKey(b) - releaseKey(a) || byPop(a, b),
    oldest: (a, b) => (a.year ?? 9999) - (b.year ?? 9999) || releaseKey(a) - releaseKey(b),
    az: (a, b) => collator.compare(a.title, b.title),
    za: (a, b) => collator.compare(b.title, a.title),
    reviews: (a, b) => b.reviews - a.reviews || byPop(a, b),
    added: (a, b) => b.createdAt - a.createdAt,
    boxoffice: (a, b) => b.boxOffice - a.boxOffice || byPop(a, b),
    longest: (a, b) => (b.runtime ?? -1) - (a.runtime ?? -1),
    shortest: (a, b) => (a.runtime ?? 99999) - (b.runtime ?? 99999),
    similar: byPop // skutočné poradie podobnosti rieši runFilter
  };
  return [...list].sort(cmp[sort] || byPop);
}

function countBy(list: CatalogMovie[], pick: (m: CatalogMovie) => string[]) {
  const map = new Map<string, number>();
  for (const m of list) for (const v of pick(m)) map.set(v, (map.get(v) || 0) + 1);
  return Object.fromEntries(Array.from(map.entries()).sort((a, b) => b[1] - a[1]));
}

// Podobnosť dvoch titulov (0–100+): žánre, kľúčové slová, réžia, herci,
// krajina, typ a blízky rok. Kvalitnejšie tituly dostanú malý bonus.
function similarity(t: CatalogMovie, m: CatalogMovie) {
  let s = 0;
  const g = t.genres.filter((x) => m.genres.includes(x)).length;
  const gUnion = new Set([...t.genres, ...m.genres]).size || 1;
  s += (g / gUnion) * 40;
  const kw = t.fTags.filter((x) => m.fTags.includes(x)).length;
  s += Math.min(5, kw) * 6;
  if (t.directors.some((d) => m.directors.includes(d))) s += 18;
  s += Math.min(3, t.cast.slice(0, 15).filter((a) => m.cast.includes(a)).length) * 6;
  if (t.writers.some((w) => m.writers.includes(w))) s += 6;
  if (t.countries.some((c) => m.countries.includes(c))) s += 4;
  if (t.contentType === m.contentType) s += 6;
  if (t.year && m.year) s += Math.max(0, 8 - Math.abs(t.year - m.year) / 2);
  s += (m.percent ?? 50) / 25;
  return s;
}

function lev(a: string, b: string) {
  if (Math.abs(a.length - b.length) > 2) return 9;
  const dp = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = dp[j];
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return dp[b.length];
}

// „Možno ste mysleli…“ — názvy, ktoré sa líšia len preklepom.
function didYouMean(catalog: CatalogMovie[], q: string) {
  const words = fold(q).split(/\s+/).filter((w) => w.length >= 3);
  if (!words.length) return [];
  const scored: Array<{ m: CatalogMovie; d: number }> = [];
  for (const m of catalog) {
    const tw = m.fTitle.split(/[^a-z0-9]+/).filter(Boolean);
    let total = 0;
    let ok = true;
    for (const w of words) {
      let best = 9;
      for (const t of tw) {
        const d = t.startsWith(w) ? 0 : lev(w, t.slice(0, w.length + 1));
        if (d < best) best = d;
        if (best === 0) break;
      }
      const limit = w.length <= 4 ? 1 : 2;
      if (best > limit) {
        ok = false;
        break;
      }
      total += best;
    }
    if (ok) scored.push({ m, d: total });
  }
  return scored
    .sort((a, b) => a.d - b.d || b.m.popularity - a.m.popularity)
    .slice(0, 5)
    .map(({ m }) => ({ title: m.title, slug: m.slug, year: m.yearRaw }));
}

export type FilterResult = {
  total: number;
  page: number;
  pages: number;
  limited: boolean; // neplatiaci narazil na limit stránok
  similarTo: { id: string; title: string; year: string | null } | null;
  didYouMean: Array<{ title: string; slug: string; year: string | null }>;
  items: CatalogMovie[];
  facets: {
    types: Record<string, number>;
    genres: Record<string, number>;
    countries: Record<string, number>;
    services: Record<string, number>;
  };
};

export async function runFilter(
  f: FilterSpec,
  opts: { userId: string | null; isMember: boolean; pageSize?: number; withFacets?: boolean; random?: boolean }
): Promise<FilterResult & { userSets: UserSets }> {
  const catalog = await getFilterCatalog();
  const needsUser = f.hideSeen || f.onlySeen || f.onlyWatchlist || !!opts.userId;
  const userSets = needsUser ? await getUserSets(opts.userId) : { seen: new Set<string>(), watchlist: new Set<string>() };
  const now = Date.now();

  // „Podobné ako…“ — nájdi cieľový film (podľa id alebo slugu)
  const target = f.similar ? catalog.find((m) => m.id === f.similar || m.slug === f.similar) || null : null;
  const result = catalog.filter((m) => matches(m, f, userSets, now, opts.isMember) && (!target || m.id !== target.id));

  let facets: FilterResult['facets'] = { types: {}, genres: {}, countries: {}, services: {} };
  if (opts.withFacets) {
    // Počty pri voľbách: koľko výsledkov by bolo, keby som zvolil túto možnosť
    // (pri danej skupine sa jej vlastný výber neberie do úvahy).
    const without = (skip: Skip) => catalog.filter((m) => matches(m, f, userSets, now, opts.isMember, skip));
    facets = {
      types: countBy(f.types.length ? without({ types: true }) : result, (m) => [m.contentType]),
      genres: countBy(f.genres.length ? without({ genres: true }) : result, (m) => m.genres),
      countries: countBy(f.countries.length ? without({ countries: true }) : result, (m) => m.countries),
      services: countBy(f.services.length ? without({ services: true }) : result, (m) => m.services)
    };
  }

  let sorted: CatalogMovie[];
  if (target && (f.sort === 'similar' || f.sort === 'popular')) {
    const score = new Map(result.map((m) => [m.id, similarity(target, m)] as [string, number]));
    sorted = result.filter((m) => (score.get(m.id) || 0) > 8).sort((a, b) => (score.get(b.id) || 0) - (score.get(a.id) || 0));
  } else {
    sorted = sortMovies(result, f.sort === 'similar' ? 'popular' : f.sort);
  }

  // Náhodný tip („Neviem, čo pozerať“) — z výsledkov, prednostne dobre hodnotené
  if (opts.random) {
    // Tip na film: nikdy nie titul, ktorý ešte nemal premiéru, a nikdy nie
    // titul, ktorý používateľ videl (ohodnotil/zrecenzoval) v tomto roku.
    const thisYear = new Date().getFullYear();
    const seenNow = userSets.seenThisYear || new Set<string>();
    sorted = sorted.filter((m) => {
      if (seenNow.has(m.id)) return false;
      if (m.releaseDate && new Date(m.releaseDate).getTime() > now) return false;
      if (!m.releaseDate && m.year !== null && m.year > thisYear) return false;
      return true;
    });
    const good = sorted.filter((m) => (m.percent ?? 0) >= 65);
    const pool = good.length >= 5 ? good : sorted;
    const pick = pool.length ? pool[Math.floor(Math.random() * Math.min(pool.length, 400))] : null;
    return {
      total: sorted.length, page: 1, pages: 1, limited: false, items: pick ? [pick] : [], facets,
      userSets, similarTo: null, didYouMean: []
    };
  }
  const pageSize = opts.pageSize ?? PAGE_SIZE;
  const pages = Math.max(1, Math.ceil(sorted.length / Math.max(1, pageSize)));
  const maxPage = opts.isMember ? pages : Math.min(pages, MAX_FREE_PAGE);
  const page = Math.min(f.page, maxPage);
  const items = pageSize > 0 ? sorted.slice((page - 1) * pageSize, page * pageSize) : [];

  return {
    total: sorted.length,
    page,
    pages: maxPage,
    limited: !opts.isMember && pages > MAX_FREE_PAGE,
    items,
    facets,
    userSets,
    similarTo: target ? { id: target.id, title: target.title, year: target.yearRaw } : null,
    didYouMean: sorted.length === 0 && f.q.length >= 3 ? didYouMean(catalog, f.q) : []
  };
}

// --- Možnosti do formulára (žánre, krajiny…) a našepkávanie -----------------

// Voľby do formulára sú malé (pár kB), preto sa ukladajú do zdieľanej cache
// Vercelu (unstable_cache). Nová inštancia servera ich tak dostane hotové
// a nemusí kvôli nim načítať celý katalóg z databázy.
export const getFilterOptions = unstable_cache(() => buildFilterOptions(), ['movie-filter-options-v1'], {
  revalidate: 900,
  tags: ['movie-filter']
});

async function buildFilterOptions() {
  return memo('movieFilter:options', CATALOG_TTL, async () => {
    const [catalog, services] = await Promise.all([
      getFilterCatalog(),
      prisma.streamingService.findMany({ orderBy: { order: 'asc' }, select: { id: true, name: true, icon: true, color: true } })
    ]);
    const years = catalog.map((m) => m.year).filter((y): y is number => y !== null);
    const runtimes = catalog.map((m) => m.runtime).filter((r): r is number => r !== null && r > 0);
    return {
      types: countBy(catalog, (m) => [m.contentType]),
      genres: countBy(catalog, (m) => m.genres),
      countries: countBy(catalog, (m) => m.countries),
      services: services.map((s) => ({ ...s, count: catalog.filter((m) => m.services.includes(s.id)).length })),
      yearMin: years.length ? Math.min(...years) : 1900,
      yearMax: years.length ? Math.max(...years) : new Date().getFullYear(),
      runtimeMax: runtimes.length ? Math.max(...runtimes) : 240,
      total: catalog.length
    };
  });
}

export type SuggestKind = 'director' | 'actor' | 'writer' | 'camera' | 'music' | 'keyword' | 'title';

// Index mien (alebo kľúčových slov) z celého katalógu: meno → počet titulov.
export async function getNameIndex(kind: Exclude<SuggestKind, 'title'>) {
  return memo(`movieFilter:suggest:${kind}`, CATALOG_TTL, async () => {
    const catalog = await getFilterCatalog();
    const pick: Record<SuggestKind, (m: CatalogMovie) => string[]> = {
      director: (m) => m.directors,
      actor: (m) => m.cast,
      writer: (m) => m.writers,
      camera: (m) => m.camera,
      music: (m) => m.music,
      keyword: (m) => m.tags,
      title: () => []
    };
    const map = new Map<string, { name: string; count: number; f: string }>();
    for (const m of catalog) {
      for (const name of pick[kind](m)) {
        const key = fold(name);
        const hit = map.get(key);
        if (hit) hit.count++;
        else map.set(key, { name, count: 1, f: key });
      }
    }
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  });
}

export async function suggest(kind: SuggestKind, q: string, limit = 10) {
  const query = fold(q);
  if (query.length < 2) return [];
  if (kind === 'title') {
    // Pre „Podobné ako…“ — názvy filmov s rokom (najznámejšie prvé)
    const catalog = await getFilterCatalog();
    const words = query.split(/\s+/).filter(Boolean);
    return catalog
      .filter((m) => words.every((w) => m.fTitle.includes(w)))
      .sort((a, b) => b.popularity - a.popularity || b.votes - a.votes)
      .slice(0, limit)
      .map((m) => ({ name: m.title, count: m.year || 0, id: m.id, slug: m.slug, poster: m.poster }));
  }
  const index = await getNameIndex(kind);
  const starts: typeof index = [];
  const contains: typeof index = [];
  for (const e of index) {
    if (e.f.startsWith(query) || e.f.split(' ').some((w) => w.startsWith(query))) starts.push(e);
    else if (e.f.includes(query)) contains.push(e);
    if (starts.length >= limit) break;
  }
  return [...starts, ...contains].slice(0, limit).map((e) => ({ name: e.name, count: e.count }));
}

// Čo ide klientovi o jednom titule.
export function toListItem(m: CatalogMovie, u: UserSets) {
  return {
    id: m.id,
    title: m.title,
    originalTitle: m.originalTitle,
    slug: m.slug,
    poster: m.poster,
    year: m.yearRaw,
    contentType: m.contentType,
    genres: m.genres,
    countries: m.countries,
    runtime: m.runtime,
    percent: m.percent,
    votes: m.votes,
    nowShowing: m.nowShowing,
    online: m.online,
    hasSubtitles: m.hasSubtitles,
    hasDubbing: m.hasDubbing,
    isCamVersion: m.isCamVersion,
    releaseDate: m.releaseDate,
    premiereType: m.premiereType,
    watched: u.seen.has(m.id),
    inWatchlist: u.watchlist.has(m.id),
    directors: m.directors.slice(0, 2),
    cast: m.cast.slice(0, 3),
    services: m.services,
    reviews: m.reviews
  };
}
