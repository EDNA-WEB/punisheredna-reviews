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

const CATALOG_TTL = 5 * 60 * 1000;
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

async function loadCatalog(): Promise<CatalogMovie[]> {
  const rows = await prisma.movie.findMany({
    where: { approved: true },
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
      ratings: { where: { seasonId: null, episodeId: null }, select: { value: true } },
      streamingServices: { select: { streamingServiceId: true } },
      keywords: { select: { name: true } },
      premiereDates: { orderBy: { releaseDate: 'asc' }, take: 1, select: { type: true } },
      _count: { select: { reviews: { where: { seasonId: null, episodeId: null } }, photos: true, videos: true, trivia: true } }
    }
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
      releaseDate: m.releaseDate ? m.releaseDate.toISOString() : null,
      createdAt: m.createdAt.getTime(),
      popularity: m.tmdbPopularity || 0,
      percent: computeBlendedPercent(m.ratings, m.tmdbVoteAverage, m.tmdbVoteCount) ?? null,
      votes: m.ratings.length + (m.tmdbVoteCount || 0),
      ratingCount: m.ratings.length,
      boxOffice: m.boxOffice ? Number(m.boxOffice) : 0,
      reviews: m._count.reviews,
      photos: m._count.photos,
      videos: m._count.videos,
      trivia: m._count.trivia,
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
  | 'shortest';

export const SORTS: SortKey[] = ['popular', 'rating', 'worst', 'newest', 'oldest', 'az', 'za', 'reviews', 'added', 'boxoffice', 'longest', 'shortest'];

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
  n += [f.cinema, f.online, f.subs, f.dub, f.hideSeen, f.onlySeen, f.onlyWatchlist, f.hasReviews, f.hasGallery, f.hasVideos, f.hasTrivia].filter(Boolean).length;
  n += [f.director, f.writer, f.camera, f.music].filter(Boolean).length + (f.actors.length ? 1 : 0);
  n += f.keywords.length ? 1 : 0;
  return n;
}

// --- Osobné údaje (len ak treba) --------------------------------------------

export type UserSets = { seen: Set<string>; watchlist: Set<string> };

export async function getUserSets(userId: string | null): Promise<UserSets> {
  if (!userId) return { seen: new Set(), watchlist: new Set() };
  return memo(`movieFilter:user:${userId}`, 60 * 1000, async () => {
    const [rated, reviewed, watch, listItems] = await Promise.all([
      prisma.rating.findMany({ where: { userId, seasonId: null, episodeId: null }, select: { movieId: true } }),
      prisma.review.findMany({ where: { authorId: userId, seasonId: null, episodeId: null }, select: { movieId: true } }),
      prisma.watchlistItem.findMany({ where: { userId }, select: { movieId: true } }),
      prisma.movieListItem.findMany({ where: { list: { authorId: userId, title: 'Chcem vidieť' } }, select: { movieId: true } })
    ]);
    return {
      seen: new Set([...rated, ...reviewed].map((r) => r.movieId)),
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
  if (!skip.countries && f.countries.length && !f.countries.some((c) => m.countries.includes(c))) return false;
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
    shortest: (a, b) => (a.runtime ?? 99999) - (b.runtime ?? 99999)
  };
  return [...list].sort(cmp[sort] || byPop);
}

function countBy(list: CatalogMovie[], pick: (m: CatalogMovie) => string[]) {
  const map = new Map<string, number>();
  for (const m of list) for (const v of pick(m)) map.set(v, (map.get(v) || 0) + 1);
  return Object.fromEntries(Array.from(map.entries()).sort((a, b) => b[1] - a[1]));
}

export type FilterResult = {
  total: number;
  page: number;
  pages: number;
  limited: boolean; // neplatiaci narazil na limit stránok
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
  opts: { userId: string | null; isMember: boolean; pageSize?: number; withFacets?: boolean }
): Promise<FilterResult & { userSets: UserSets }> {
  const catalog = await getFilterCatalog();
  const needsUser = f.hideSeen || f.onlySeen || f.onlyWatchlist || !!opts.userId;
  const userSets = needsUser ? await getUserSets(opts.userId) : { seen: new Set<string>(), watchlist: new Set<string>() };
  const now = Date.now();

  const result = catalog.filter((m) => matches(m, f, userSets, now, opts.isMember));

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

  const sorted = sortMovies(result, f.sort);
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
    userSets
  };
}

// --- Možnosti do formulára (žánre, krajiny…) a našepkávanie -----------------

export async function getFilterOptions() {
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

export type SuggestKind = 'director' | 'actor' | 'writer' | 'camera' | 'music' | 'keyword';

export async function suggest(kind: SuggestKind, q: string, limit = 10) {
  const query = fold(q);
  if (query.length < 2) return [];
  const index = await memo(`movieFilter:suggest:${kind}`, CATALOG_TTL, async () => {
    const catalog = await getFilterCatalog();
    const pick: Record<SuggestKind, (m: CatalogMovie) => string[]> = {
      director: (m) => m.directors,
      actor: (m) => m.cast,
      writer: (m) => m.writers,
      camera: (m) => m.camera,
      music: (m) => m.music,
      keyword: (m) => m.tags
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
    inWatchlist: u.watchlist.has(m.id)
  };
}
