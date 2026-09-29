import { unstable_cache } from 'next/cache';
import { prisma } from './prisma';
import { normalizeTitle, pickField } from './titleMatch';
import { getMoviePercents } from './moviePercents';
import { tmdbSearchMovie } from './tmdb';

// ---------------------------------------------------------------------------
// Víkendový Top Box Office (USA) z GitHub bota (EDNA-WEB/bot → data.json).
// Bot sťahuje rebríček z IMDb (záloha Box Office Mojo) raz denne; web si ho
// berie SÁM každých 10 hodín. Výsledok (vrátane spárovania s filmami, českých
// názvov a percent) drží Vercel Data Cache 10 h — databáza aj TMDB sa kvôli
// tomuto boxu volajú najviac raz za 10 hodín.
//
// Názvy: prednostne český názov z našej databázy; ak film u nás nie je,
// český názov a plagát z TMDB; až potom originálny anglický názov.
// Reedície (napr. predĺžená verzia Avengers: Endgame) sa spárujú s pôvodným
// filmom a dostanú štítok "reedícia".
// ---------------------------------------------------------------------------

const DATA_URL = 'https://raw.githubusercontent.com/EDNA-WEB/bot/main/data.json';
const REFRESH_SECONDS = 10 * 60 * 60; // 10 hodín
const LIMIT = 10;

export type BoxOfficeEntry = {
  rank: number;
  title: string; // zobrazovaný (český, ak existuje)
  originalTitle: string; // pôvodný anglický z IMDb
  poster: string | null;
  isReRelease: boolean;
  weeks: number | null;
  grossLabel: string | null; // "$26.1M"
  grossValue: number | null; // na dĺžku pruhu
  totalLabel: string | null;
  movie: {
    id: string;
    slug: string;
    title: string;
    year: string | null;
    poster: string | null;
    runtimeMinutes: number | null;
    synopsis: string | null;
    percent: number | null;
    directors: { name: string; slug: string | null }[];
    stars: { name: string; slug: string | null }[];
  } | null;
};

export type WeekendBoxOffice = {
  weekendStart: string;
  weekendEnd: string;
  source: string | null;
  updatedAt: string | null;
  entries: BoxOfficeEntry[];
} | null;

// "$26.1M" / "26,100,000" / 26100000 → číslo v dolároch
function parseMoney(v: unknown): number | null {
  if (typeof v === 'number' && isFinite(v)) return v;
  if (typeof v !== 'string') return null;
  const m = v.replace(/,/g, '').match(/([\d.]+)\s*([kmb])?/i);
  if (!m) return null;
  const n = parseFloat(m[1]);
  const mult = { k: 1e3, m: 1e6, b: 1e9 }[(m[2] || '').toLowerCase() as 'k' | 'm' | 'b'] || 1;
  return isFinite(n) ? n * mult : null;
}
function formatMoney(n: number | null): string | null {
  if (n === null) return null;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${Math.round(n / 1e3)}K`;
  return `$${Math.round(n)}`;
}

// Posledný víkend (piatok–nedeľa), ktorý už skončil — keď bot dátum víkendu neposiela.
function lastWeekend(now = new Date()) {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0 = nedeľa
  const back = day === 0 ? 7 : day;
  const sunday = new Date(d);
  sunday.setDate(d.getDate() - back);
  const friday = new Date(sunday);
  friday.setDate(sunday.getDate() - 2);
  return { start: friday.toISOString(), end: sunday.toISOString() };
}

// Prípony reedícií v názve ("Re-release", "Extended Cut", "IMAX", "(2026)"…).
const RERELEASE_RE =
  /\s*[([]?\s*(?:\d{4}\s+)?(?:re-?release|re-?issue|extended(?:\s+(?:cut|edition|version))?|director'?s\s+cut|imax(?:\s+re-?release)?|remastered|\d{1,2}(?:st|nd|rd|th)\s+anniversary(?:\s+re-?release)?)\s*[)\]]?\s*$/i;
function cleanTitle(t: string) {
  let s = t.trim();
  let marker = false;
  for (let i = 0; i < 3; i++) {
    const next = s.replace(RERELEASE_RE, '').replace(/\s*\(\d{4}\)\s*$/, '').trim();
    if (next !== s) marker = marker || RERELEASE_RE.test(s);
    if (next === s) break;
    s = next;
  }
  // Názov, ktorý by po očistení zmizol úplne (film sa naozaj volá napr. "Extended"), ponecháme.
  return s ? { title: s, marker } : { title: t.trim(), marker: false };
}

// Varianty názvu pre dopyt do databázy (dvojbodka ↔ pomlčka, rovnako ako titleMatch).
function titleVariants(t: string) {
  return Array.from(new Set([t, t.replace(/\s*:\s*/g, ' - '), t.replace(/\s*:\s*/g, ' – '), t.replace(/\s+[–-]\s+/g, ': ')]));
}

const splitNames = (v: string | null, n: number) => (v || '').split(',').map((x) => x.trim()).filter(Boolean).slice(0, n);

type Candidate = {
  id: string; slug: string; title: string; originalTitle: string | null; year: string | null; poster: string | null;
  runtimeMinutes: number | null; synopsis: string | null; director: string | null; cast: string | null; createdAt: Date; tmdbId: number | null;
};
const movieSelect = {
  id: true, slug: true, title: true, originalTitle: true, year: true, poster: true,
  runtimeMinutes: true, synopsis: true, director: true, cast: true, createdAt: true, tmdbId: true
} as const;

async function loadWeekendBoxOffice(): Promise<WeekendBoxOffice> {
  // Časová pečiatka v URL obíde medzipamäť GitHubu/CDN — vždy čerstvý súbor.
  const res = await fetch(`${DATA_URL}?t=${Date.now()}`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`GitHub vrátil ${res.status}`);
  const raw = await res.json();

  const list: any[] = Array.isArray(raw)
    ? raw
    : (['items', 'data', 'movies', 'results', 'boxOffice', 'box_office', 'list'].map((k) => raw?.[k]).find(Array.isArray) as any[]) || [];
  const items = list
    .map((it, i) => {
      const base = typeof it === 'string' ? { title: it } : it;
      const rawTitle = String(pickField(base, ['title', 'Title', 'name', 'Name', 'titleText', 'movie', 'film']) || '').trim();
      const { title, marker } = cleanTitle(rawTitle);
      const gross = parseMoney(pickField(base, ['weekendGross', 'weekend_gross', 'gross', 'Gross', 'weekend', 'amount', 'revenue', 'earnings']));
      const total = parseMoney(pickField(base, ['totalGross', 'total_gross', 'total', 'Total', 'lifetimeGross', 'cumulative']));
      const weeks = parseInt(String(pickField(base, ['weeks', 'weeksReleased', 'Weeks']) || ''), 10) || null;
      const rank = Number(pickField(base, ['rank', 'Rank', 'position'])) || i + 1;
      const year = parseInt(String(pickField(base, ['year', 'releaseYear']) || ''), 10) || null;
      // Reedícia: značka v názve, alebo film je v kinách len krátko, no celkové
      // tržby sú mnohonásobne vyššie (zahŕňajú pôvodné uvedenie).
      const isReRelease = marker || (!!weeks && weeks <= 3 && !!gross && !!total && total > gross * 6);
      return { title, rawTitle, gross, total, weeks, rank, year, isReRelease };
    })
    .filter((it) => it.title)
    .sort((a, b) => a.rank - b.rank)
    .slice(0, LIMIT);
  if (items.length === 0) throw new Error('data.json neobsahuje žiadne filmy');

  // 1) Spárovanie s našou databázou podľa názvu / originálneho názvu.
  const or = items.flatMap((it) =>
    titleVariants(it.title).flatMap((v) => [{ title: { equals: v, mode: 'insensitive' as const } }, { originalTitle: { equals: v, mode: 'insensitive' as const } }])
  );
  const candidates: Candidate[] = await prisma.movie.findMany({ where: { approved: true, OR: or }, select: movieSelect });

  const minYear = new Date().getFullYear() - 1;
  const yearOk = (c: { year: string | null; createdAt: Date }, it: (typeof items)[number]) => {
    if (it.isReRelease) return true; // reedícia → pôvodný film môže byť starý
    const y = parseInt(String(c.year || ''), 10);
    if (it.year) return !!y && Math.abs(y - it.year) <= 1;
    if (y) return y >= minYear;
    return Date.now() - c.createdAt.getTime() < 540 * 24 * 60 * 60 * 1000;
  };
  const pickFrom = (list: Candidate[], it: (typeof items)[number]) =>
    list
      .filter((c) => yearOk(c, it))
      .sort((a, b) => Number(b.year || 0) - Number(a.year || 0) || b.createdAt.getTime() - a.createdAt.getTime())[0] || null;

  const matched: { it: (typeof items)[number]; movie: Candidate | null; tmdb: { title: string; poster: string | null } | null }[] = items.map((it) => {
    const n = normalizeTitle(it.title);
    const byName = candidates.filter((c) => normalizeTitle(c.title) === n || (c.originalTitle && normalizeTitle(c.originalTitle) === n));
    return { it, movie: pickFrom(byName, it), tmdb: null };
  });

  // 2) Nespárované → TMDB (český názov + plagát), a cez TMDB ID ešte raz naša databáza.
  const unmatched = matched.filter((m) => !m.movie);
  if (unmatched.length && process.env.TMDB_READ_ACCESS_TOKEN) {
    const found = await Promise.all(
      unmatched.map(async (m) => {
        try {
          const results = (await tmdbSearchMovie(m.it.title)).filter((r: any) => r.mediaType === 'movie');
          const n = normalizeTitle(m.it.title);
          const good = results.filter((r: any) => normalizeTitle(r.originalTitle || '') === n || normalizeTitle(r.title || '') === n);
          const byYear = good.filter((r: any) => {
            const y = parseInt(r.year, 10);
            if (m.it.isReRelease) return true;
            if (m.it.year) return !!y && Math.abs(y - m.it.year) <= 1;
            return !!y && y >= minYear;
          });
          return byYear[0] || null;
        } catch {
          return null;
        }
      })
    );
    const tmdbIds = found.filter(Boolean).map((r: any) => r.id as number);
    const byTmdb: Candidate[] = tmdbIds.length ? await prisma.movie.findMany({ where: { approved: true, tmdbId: { in: tmdbIds } }, select: movieSelect }) : [];
    unmatched.forEach((m, i) => {
      const r: any = found[i];
      if (!r) return;
      m.movie = byTmdb.find((c) => c.tmdbId === r.id) || null;
      if (!m.movie) m.tmdb = { title: r.title || m.it.title, poster: r.poster || null };
    });
  }

  const ids = matched.map((m) => m.movie?.id).filter(Boolean) as string[];
  const percents = await getMoviePercents(ids);

  // Mená režisérov/hercov s profilom (len pre zvýraznený film č. 1).
  const top = matched[0]?.movie;
  const topNames = top ? [...splitNames(top.director, 2), ...splitNames(top.cast, 3)] : [];
  const people = topNames.length ? await prisma.person.findMany({ where: { name: { in: topNames } }, select: { name: true, slug: true } }) : [];
  const slugOf = new Map<string, string>(people.map((p: { name: string; slug: string }) => [p.name, p.slug] as [string, string]));

  const weekend = raw?.weekend?.start && raw?.weekend?.end ? { start: raw.weekend.start, end: raw.weekend.end } : lastWeekend();

  return {
    weekendStart: weekend.start,
    weekendEnd: weekend.end,
    source: typeof raw?.source === 'string' ? raw.source : null,
    updatedAt: typeof raw?.updatedAt === 'string' ? raw.updatedAt : null,
    entries: matched.map(({ it, movie, tmdb }, index) => ({
      rank: it.rank,
      title: movie?.title || tmdb?.title || it.title,
      originalTitle: it.title,
      poster: movie?.poster || tmdb?.poster || null,
      isReRelease: it.isReRelease,
      weeks: it.weeks,
      grossLabel: formatMoney(it.gross),
      grossValue: it.gross,
      totalLabel: formatMoney(it.total),
      movie: movie
        ? {
            id: movie.id,
            slug: movie.slug,
            title: movie.title,
            year: movie.year,
            poster: movie.poster,
            runtimeMinutes: movie.runtimeMinutes,
            synopsis: index === 0 ? movie.synopsis : null,
            percent: percents[movie.id]?.percent ?? null,
            directors: index === 0 ? splitNames(movie.director, 2).map((name) => ({ name, slug: slugOf.get(name) || null })) : [],
            stars: index === 0 ? splitNames(movie.cast, 3).map((name) => ({ name, slug: slugOf.get(name) || null })) : []
          }
        : null
    }))
  };
}

// Do cache sa ukladá LEN úspešný výsledok — pri chybe to ďalšie zobrazenie skúsi znova.
const getCachedWeekendBoxOffice = unstable_cache(loadWeekendBoxOffice, ['weekend-box-office-v5'], {
  revalidate: REFRESH_SECONDS,
  tags: ['weekend-box-office']
});

export async function getWeekendBoxOffice(): Promise<WeekendBoxOffice> {
  try {
    return await getCachedWeekendBoxOffice();
  } catch (e) {
    console.error('[weekendBoxOffice]', (e as any)?.message || e);
    return null;
  }
}

// Diagnostika pre admina — surový pohľad, čo prišlo z GitHubu (bez cache).
export async function debugWeekendBoxOffice() {
  const res = await fetch(`${DATA_URL}?t=${Date.now()}`, { cache: 'no-store' });
  const text = await res.text();
  let parsed: WeekendBoxOffice = null;
  let error: string | null = null;
  try {
    parsed = await loadWeekendBoxOffice();
  } catch (e: any) {
    error = e?.message || String(e);
  }
  return {
    status: res.status,
    sample: text.slice(0, 1500),
    parsedCount: parsed?.entries.length || 0,
    matched: parsed?.entries.filter((x) => x.movie).length || 0,
    pairs: (parsed?.entries || []).map(
      (x) =>
        `${x.rank}. ${x.originalTitle}${x.isReRelease ? ' [reedícia]' : ''} → ${x.movie ? `${x.movie.title} (${x.movie.year || '?'}) /movie/${x.movie.slug}` : x.title !== x.originalTitle ? `${x.title} (z TMDB, nie je v databáze)` : 'nespárované'}`
    ),
    error
  };
}
