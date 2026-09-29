import { unstable_cache } from 'next/cache';
import { prisma } from './prisma';
import { normalizeTitle, pickField } from './titleMatch';
import { getMoviePercents } from './moviePercents';

// ---------------------------------------------------------------------------
// Víkendový Top Box Office (USA) z GitHub bota (EDNA-WEB/bot → data.json).
// Bot sťahuje dáta z IMDb raz za 24 h; web si ich berie SÁM každých 10 hodín:
// výsledok (vrátane spárovania s filmami v našej databáze) drží Vercel Data
// Cache 10 h, takže databáza sa kvôli tomuto boxu zobudí najviac raz za 10 h,
// nie pri každom zobrazení hlavnej stránky. Žiadny ručný zásah netreba.
// ---------------------------------------------------------------------------

const DATA_URL = 'https://raw.githubusercontent.com/EDNA-WEB/bot/main/data.json';
const REFRESH_SECONDS = 10 * 60 * 60; // 10 hodín
const LIMIT = 10;

export type BoxOfficeEntry = {
  rank: number;
  title: string;
  grossLabel: string | null; // "$26.1M"
  grossValue: number | null; // 26100000 — na dĺžku pruhu
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

export type WeekendBoxOffice = { weekendStart: string; weekendEnd: string; entries: BoxOfficeEntry[] } | null;

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
  const back = day === 0 ? 7 : day; // posledná UKONČENÁ nedeľa
  const sunday = new Date(d);
  sunday.setDate(d.getDate() - back);
  const friday = new Date(sunday);
  friday.setDate(sunday.getDate() - 2);
  return { start: friday.toISOString(), end: sunday.toISOString() };
}

// Varianty názvu pre dopyt do databázy (dvojbodka ↔ pomlčka, rovnako ako titleMatch).
function titleVariants(t: string) {
  const s = new Set([t, t.replace(/\s*:\s*/g, ' - '), t.replace(/\s*:\s*/g, ' – '), t.replace(/\s+[–-]\s+/g, ': ')]);
  return Array.from(s);
}

const splitNames = (v: string | null, n: number) => (v || '').split(',').map((x) => x.trim()).filter(Boolean).slice(0, n);

async function loadWeekendBoxOffice(): Promise<WeekendBoxOffice> {
  // Časová pečiatka v URL obíde medzipamäť GitHubu/CDN — vždy čerstvý súbor.
  const res = await fetch(`${DATA_URL}?t=${Date.now()}`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`GitHub vrátil ${res.status}`);
  const raw = await res.json();

  // Podporí viac tvarov: [ {...} ], { items|data|movies|results|boxOffice: [...] },
  // prípadne pole obyčajných textov [ "Resident Evil", ... ].
  const list: any[] = Array.isArray(raw)
    ? raw
    : (['items', 'data', 'movies', 'results', 'boxOffice', 'box_office', 'list'].map((k) => raw?.[k]).find(Array.isArray) as any[]) || [];
  const items = list
    .map((it, i) => {
      if (typeof it === 'string') return { title: it.trim(), gross: null, total: null, rank: i + 1 };
      const title = String(pickField(it, ['title', 'Title', 'name', 'Name', 'titleText', 'movie', 'film']) || '').trim();
      const gross = parseMoney(pickField(it, ['weekendGross', 'weekend_gross', 'gross', 'Gross', 'weekend', 'amount', 'revenue', 'earnings']));
      const total = parseMoney(pickField(it, ['totalGross', 'total_gross', 'total', 'Total', 'lifetimeGross', 'cumulative']));
      const rank = Number(pickField(it, ['rank', 'Rank', 'position'])) || i + 1;
      return { title, gross, total, rank };
    })
    .filter((it) => it.title)
    .sort((a, b) => a.rank - b.rank)
    .slice(0, LIMIT);
  if (items.length === 0) throw new Error('data.json neobsahuje žiadne filmy');

  // Spárovanie s filmami v databáze — jeden dopyt pre celý zoznam.
  const or = items.flatMap((it) =>
    titleVariants(it.title).flatMap((v) => [{ title: { equals: v, mode: 'insensitive' as const } }, { originalTitle: { equals: v, mode: 'insensitive' as const } }])
  );
  const candidates = await prisma.movie.findMany({
    where: { approved: true, OR: or },
    select: {
      id: true, slug: true, title: true, originalTitle: true, year: true, poster: true,
      runtimeMinutes: true, synopsis: true, director: true, cast: true, createdAt: true
    }
  });

  // Box office = filmy, ktoré sú PRÁVE v kinách. Spárujeme preto len s filmom
  // z tohto alebo minulého roka — inak by sa napr. "Daniel" alebo "Odysea"
  // prepojil so starým filmom rovnakého mena (iný plagát, iný odkaz).
  // Ak aktuálny film v databáze nie je, zobrazí sa len názov bez odkazu.
  const minYear = new Date().getFullYear() - 1;
  const isCurrent = (c: { year: string | null; createdAt: Date }) => {
    const y = parseInt(String(c.year || ''), 10);
    if (y) return y >= minYear;
    return Date.now() - c.createdAt.getTime() < 540 * 24 * 60 * 60 * 1000; // bez roku: pridaný za posledných ~18 mesiacov
  };
  const pick = (title: string) => {
    const n = normalizeTitle(title);
    const matches = candidates.filter(
      (c) => isCurrent(c) && (normalizeTitle(c.title) === n || (c.originalTitle && normalizeTitle(c.originalTitle) === n))
    );
    // Pri viacerých zhodách ber najnovší film.
    return matches.sort((a, b) => Number(b.year || 0) - Number(a.year || 0) || b.createdAt.getTime() - a.createdAt.getTime())[0] || null;
  };
  const matched = items.map((it) => ({ it, movie: pick(it.title) }));

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
    entries: matched.map(({ it, movie }, index) => ({
      rank: it.rank,
      title: movie?.title || it.title,
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

// Do cache sa ukladá LEN úspešný výsledok. Pri chybe (GitHub nedostupný,
// prázdny súbor…) sa nič neuloží a ďalšie zobrazenie to skúsi znova —
// inak by sa "nič" držalo v pamäti celých 10 hodín.
const getCachedWeekendBoxOffice = unstable_cache(loadWeekendBoxOffice, ['weekend-box-office-v3'], {
  revalidate: REFRESH_SECONDS,
  tags: ['weekend-box-office']
});

export async function getWeekendBoxOffice(): Promise<WeekendBoxOffice> {
  try {
    return await getCachedWeekendBoxOffice();
  } catch (e) {
    console.error('[weekendBoxOffice]', (e as any)?.message || e);
    return null; // box sa jednoducho neukáže, stránka funguje ďalej
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
    // Každý riadok: poradie, názov z bota → film v databáze (alebo "nespárované")
    pairs: (parsed?.entries || []).map((x) => `${x.rank}. ${x.title} → ${x.movie ? `${x.movie.title} (${x.movie.year || '?'}) /movie/${x.movie.slug}` : 'nespárované'}`),
    error
  };
}
