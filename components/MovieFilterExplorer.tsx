'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { valueLabel } from '@/lib/valueLabels';
import { FILTER_PRESETS } from '@/lib/filterPresets';
import { useFilterFormState } from './FilterFormState';
import Icon from './filter/FilterIcon';

// ---------------------------------------------------------------------------
// FILTER FILMOV A SERIÁLOV (web) — čistý dizajn filmovej databázy.
// Panel vľavo (zaškrtávacie zoznamy s počtami), výsledky vpravo, kolekcie
// a uložené filtre schované v jednom tlačidle „Kolekce“, „Tip na film“.
// ---------------------------------------------------------------------------

type Options = {
  types: Record<string, number>;
  genres: Record<string, number>;
  countries: Record<string, number>;
  services: Array<{ id: string; name: string; icon: string | null; color: string | null; count: number }>;
  yearMin: number;
  yearMax: number;
  runtimeMax: number;
  total: number;
};

type Item = {
  id: string;
  title: string;
  originalTitle: string | null;
  slug: string;
  poster: string | null;
  year: string | null;
  contentType: string;
  genres: string[];
  countries: string[];
  runtime: number | null;
  percent: number | null;
  percentColor: string | null;
  votes: number;
  nowShowing: boolean;
  online: boolean;
  watched: boolean;
  inWatchlist: boolean;
  directors: string[];
  cast: string[];
  services: string[];
  reviews: number;
  hasSubtitles: boolean;
  hasDubbing: boolean;
};

type Facets = { types: Record<string, number>; genres: Record<string, number>; countries: Record<string, number>; services: Record<string, number> };

const LIST_KEYS = ['types', 'genres', 'exGenres', 'countries', 'exCountries', 'services', 'actors', 'keywords'] as const;
const TEXT_KEYS = ['q', 'yearFrom', 'yearTo', 'lenFrom', 'lenTo', 'ratingFrom', 'ratingTo', 'minVotes', 'maxVotes', 'addedDays', 'director', 'writer', 'camera', 'music', 'genresMode', 'countriesMode', 'sort', 'similar'] as const;
const FLAG_KEYS = ['cinema', 'online', 'subs', 'dub', 'hideSeen', 'onlySeen', 'onlyWatchlist', 'hasReviews', 'hasGallery', 'hasVideos', 'hasTrivia', 'upcoming', 'noCam'] as const;

type ListKey = (typeof LIST_KEYS)[number];
type TextKey = (typeof TEXT_KEYS)[number];
type FlagKey = (typeof FLAG_KEYS)[number];
type State = Record<ListKey, string[]> & Record<TextKey, string> & Record<FlagKey, boolean>;

const EMPTY: State = {
  types: [], genres: [], exGenres: [], countries: [], exCountries: [], services: [], actors: [], keywords: [],
  q: '', yearFrom: '', yearTo: '', lenFrom: '', lenTo: '', ratingFrom: '', ratingTo: '', minVotes: '', maxVotes: '', addedDays: '',
  director: '', writer: '', camera: '', music: '', genresMode: 'any', countriesMode: 'any', sort: 'popular', similar: '',
  cinema: false, online: false, subs: false, dub: false, hideSeen: false, onlySeen: false, onlyWatchlist: false,
  hasReviews: false, hasGallery: false, hasVideos: false, hasTrivia: false, upcoming: false, noCam: false
};

const OLD_ALIASES: Record<string, string> = { genre: 'genres', country: 'countries', tag: 'keywords', tags: 'keywords', actor: 'actors', nowShowing: 'cinema', minLength: 'lenFrom', maxLength: 'lenTo', screenplay: 'writer', cinematography: 'camera', minRating: 'ratingFrom' };
const OLD_SORTS: Record<string, string> = { najnovsie: 'newest', najstarsie: 'oldest', 'najnovsie-pridane': 'added', najlepsie: 'rating', najhorsie: 'worst' };

function applyParams(base: State, entries: Array<[string, string]>): State {
  const s: State = JSON.parse(JSON.stringify(base));
  entries.forEach(([rawKey, value]) => {
    const key = OLD_ALIASES[rawKey] || rawKey;
    if ((LIST_KEYS as readonly string[]).includes(key)) {
      (s as any)[key] = Array.from(new Set([...(s as any)[key], ...String(value).split(',').map((x) => x.trim()).filter(Boolean)]));
    } else if ((FLAG_KEYS as readonly string[]).includes(key)) {
      (s as any)[key] = value === '1' || value === 'true';
    } else if ((TEXT_KEYS as readonly string[]).includes(key)) {
      (s as any)[key] = key === 'sort' ? OLD_SORTS[value] || value : String(value);
    }
  });
  return s;
}

function toParams(s: State) {
  const p = new URLSearchParams();
  LIST_KEYS.forEach((k) => s[k].length && p.set(k, s[k].join(',')));
  TEXT_KEYS.forEach((k) => {
    const v = String(s[k] || '').trim();
    if (!v || ((k === 'genresMode' || k === 'countriesMode') && v === 'any') || (k === 'sort' && v === 'popular')) return;
    p.set(k, v);
  });
  FLAG_KEYS.forEach((k) => s[k] && p.set(k, '1'));
  return p;
}

const SORT_LABELS: Record<string, string> = {
  popular: 'Popularity',
  rating: 'Hodnocení – nejlepší',
  worst: 'Hodnocení – nejhorší',
  newest: 'Rok – nejnovější',
  oldest: 'Rok – nejstarší',
  az: 'Název A–Z',
  za: 'Název Z–A',
  reviews: 'Počtu recenzí',
  added: 'Data přidání',
  boxoffice: 'Tržeb',
  longest: 'Délky – nejdelší',
  shortest: 'Délky – nejkratší',
  similar: 'Podobnosti'
};

const DECADES = [
  { label: '2020+', from: 2020, to: null },
  { label: '2010–19', from: 2010, to: 2019 },
  { label: '2000–09', from: 2000, to: 2009 },
  { label: '90. léta', from: 1990, to: 1999 },
  { label: '80. léta', from: 1980, to: 1989 },
  { label: 'Starší', from: null, to: 1979 }
];

const VOTES = [
  { label: 'Bez omezení', value: '' },
  { label: 'Alespoň 10', value: '10' },
  { label: 'Alespoň 100', value: '100' },
  { label: 'Alespoň 1 000', value: '1000' },
  { label: 'Alespoň 10 000', value: '10000' }
];

const PEOPLE: Array<{ key: 'director' | 'writer' | 'camera' | 'music'; kind: string; label: string }> = [
  { key: 'director', kind: 'director', label: 'Režie' },
  { key: 'writer', kind: 'writer', label: 'Scénář' },
  { key: 'camera', kind: 'camera', label: 'Kamera' },
  { key: 'music', kind: 'music', label: 'Hudba' }
];

const SAVED_KEY = 'kf_filter_saved';

function readLS<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}
function writeLS(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* nevadí */
  }
}

// ---------------------------------------------------------------------------
// Stavebné prvky
// ---------------------------------------------------------------------------

function Section({ title, children, defaultOpen = true, count }: { title: string; children: React.ReactNode; defaultOpen?: boolean; count?: number }) {
  const [open, setOpen] = useState(defaultOpen || !!count);
  return (
    <div className="border-b border-line">
      <button type="button" onClick={() => setOpen(!open)} className="w-full flex items-center gap-2 py-3.5 text-left group">
        <span className="text-[13px] font-semibold text-ink">{title}</span>
        {count ? <span className="text-[11px] font-semibold text-accent">· {count}</span> : null}
        <Icon name="chevron" size={16} className={`ml-auto text-muted transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="pb-4">{children}</div>}
    </div>
  );
}

// Riadok so zaškrtávacím políčkom. state: off / on / ex (vylúčené)
function CheckRow({ label, count, state, onClick, color }: { label: string; count?: number; state: 'off' | 'on' | 'ex'; onClick: () => void; color?: string | null }) {
  const disabled = state === 'off' && count === 0;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="w-full flex items-center gap-2.5 py-[5px] text-left disabled:opacity-35 disabled:cursor-not-allowed group"
    >
      <span
        className={`w-[17px] h-[17px] rounded-[4px] border flex items-center justify-center transition-colors flex-none ${
          state === 'on' ? 'bg-accent border-accent text-white' : state === 'ex' ? 'bg-danger border-danger text-white' : 'border-line group-hover:border-muted'
        }`}
      >
        {state === 'on' && <Icon name="check" size={12} strokeWidth={3} />}
        {state === 'ex' && <Icon name="minus" size={12} strokeWidth={3} />}
      </span>
      {color ? <span className="w-2.5 h-2.5 rounded-sm flex-none" style={{ backgroundColor: color }} /> : null}
      <span className={`text-[13px] flex-1 truncate ${state === 'ex' ? 'text-danger line-through' : 'text-ink'}`}>{label}</span>
      {count !== undefined && state === 'off' ? <span className="text-[11px] tabular-nums text-muted">{count.toLocaleString('cs-CZ')}</span> : null}
    </button>
  );
}

function Switch({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" className="w-full flex items-center justify-between gap-3 py-1.5 text-left" onClick={() => onChange(!checked)}>
      <span className="min-w-0">
        <span className="text-[13px] text-ink block">{label}</span>
        {hint && <span className="text-[11px] text-muted block leading-tight mt-0.5">{hint}</span>}
      </span>
      <span role="switch" aria-checked={checked} className={`relative w-9 h-5 rounded-full transition-colors flex-none ${checked ? 'bg-accent' : 'bg-line'}`}>
        <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${checked ? 'left-[18px]' : 'left-0.5'}`} />
      </span>
    </button>
  );
}

function DualRange({
  min,
  max,
  step = 1,
  from,
  to,
  onChange,
  format = (v: number) => String(v)
}: {
  min: number;
  max: number;
  step?: number;
  from: string;
  to: string;
  onChange: (from: string, to: string) => void;
  format?: (v: number) => string;
}) {
  const a = from === '' ? min : Math.max(min, Math.min(max, Number(from)));
  const b = to === '' ? max : Math.max(min, Math.min(max, Number(to)));
  const pct = (v: number) => ((v - min) / (max - min || 1)) * 100;
  const emit = (na: number, nb: number) => onChange(na <= min ? '' : String(na), nb >= max ? '' : String(nb));
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-ink bg-surface border border-line rounded-md px-2 py-0.5 tabular-nums">{format(a)}</span>
        <span className="text-xs font-semibold text-ink bg-surface border border-line rounded-md px-2 py-0.5 tabular-nums">{format(b)}</span>
      </div>
      <div className="relative h-5 text-accent">
        <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 h-1 rounded-full bg-line" />
        <div className="absolute top-1/2 -translate-y-1/2 h-1 rounded-full bg-accent" style={{ left: `${pct(a)}%`, right: `${100 - pct(b)}%` }} />
        <input type="range" min={min} max={max} step={step} value={a} onChange={(e) => emit(Math.min(Number(e.target.value), b), b)} className="kf-range absolute inset-0 w-full appearance-none bg-transparent pointer-events-none" aria-label="Od" />
        <input type="range" min={min} max={max} step={step} value={b} onChange={(e) => emit(a, Math.max(Number(e.target.value), a))} className="kf-range absolute inset-0 w-full appearance-none bg-transparent pointer-events-none" aria-label="Do" />
      </div>
    </div>
  );
}

function Suggest({ kind, placeholder, onPick, value, onChange }: { kind: string; placeholder: string; onPick: (name: string, item?: any) => void; value?: string; onChange?: (v: string) => void }) {
  const [text, setText] = useState(value || '');
  const [list, setList] = useState<Array<{ name: string; count: number; id?: string; poster?: string | null }>>([]);
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(0);
  useEffect(() => setText(value || ''), [value]);
  useEffect(() => {
    const q = text.trim();
    if (q.length < 2 || !open) {
      setList([]);
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      fetch(`/api/movie-filter/suggest?kind=${kind}&q=${encodeURIComponent(q)}`, { signal: ctrl.signal })
        .then((r) => r.json())
        .then((d) => {
          setList(Array.isArray(d) ? d : []);
          setHi(0);
        })
        .catch(() => {});
    }, 160);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [text, kind, open]);

  function choose(item: { name: string } | undefined) {
    const name = item?.name || text.trim();
    if (!name) return;
    onPick(name, item);
    setText(onChange ? name : '');
    setOpen(false);
  }

  return (
    <div className="relative">
      <input
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setOpen(true);
          onChange?.(e.target.value);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setHi((h) => Math.min(list.length - 1, h + 1));
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setHi((h) => Math.max(0, h - 1));
          } else if (e.key === 'Enter') {
            e.preventDefault();
            if (kind === 'title' && !list[hi]) return;
            choose(list[hi]);
          }
        }}
        placeholder={placeholder}
        className="w-full bg-surface border border-line rounded-md px-3 py-2 text-[13px] text-ink placeholder:text-muted outline-none focus:border-accent"
      />
      {open && list.length > 0 && (
        <div className="absolute z-30 left-0 right-0 mt-1 bg-card border border-line rounded-md shadow-xl max-h-72 overflow-auto py-1">
          {list.map((s, i) => (
            <button
              key={`${s.name}-${i}`}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onMouseEnter={() => setHi(i)}
              onClick={() => choose(s)}
              className={`w-full flex items-center gap-2.5 px-3 py-1.5 text-[13px] text-left ${i === hi ? 'bg-surface' : ''}`}
            >
              {kind === 'title' && <span className="w-6 h-9 rounded-sm bg-line overflow-hidden flex-none">{s.poster ? <img src={s.poster} alt="" className="w-full h-full object-cover" /> : null}</span>}
              <span className="text-ink truncate flex-1">{s.name}</span>
              <span className="text-[11px] text-muted tabular-nums">{kind === 'title' ? s.count || '' : s.count}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Rating({ m, size = 'sm' }: { m: Pick<Item, 'percent' | 'percentColor'>; size?: 'sm' | 'lg' }) {
  if (m.percent === null || m.percent === undefined) return null;
  return (
    <span
      className={`inline-flex items-center justify-center font-bold text-white tabular-nums rounded-[4px] ${size === 'lg' ? 'text-base px-2.5 h-9 min-w-[52px]' : 'text-[12px] px-1.5 h-6 min-w-[38px]'} ${m.percentColor ? '' : 'bg-accent'}`}
      style={m.percentColor ? { backgroundColor: m.percentColor } : undefined}
    >
      {m.percent}%
    </span>
  );
}

function Card({ m }: { m: Item }) {
  const meta = [m.year, m.genres.slice(0, 2).map(valueLabel).join(', ')].filter(Boolean).join(' · ');
  return (
    <Link href={`/movie/${m.slug}`} className="group block">
      <div className="relative aspect-[2/3] rounded-md overflow-hidden bg-surface ring-1 ring-line">
        {m.poster ? (
          <img src={m.poster} alt={m.title} loading="lazy" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted">
            <Icon name="film" size={32} strokeWidth={1.2} />
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/70 to-transparent pointer-events-none" />
        <div className="absolute left-2 bottom-2">
          <Rating m={m} />
        </div>
        {m.watched && (
          <span className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/70 text-white flex items-center justify-center" title="Viděno">
            <Icon name="check" size={13} strokeWidth={2.6} />
          </span>
        )}
        {m.nowShowing && <span className="absolute top-2 left-2 text-[10px] font-semibold uppercase tracking-wide bg-black/70 text-white rounded-sm px-1.5 py-0.5">V kině</span>}
      </div>
      <div className="mt-2.5">
        <div className="text-[13.5px] font-semibold text-ink leading-snug line-clamp-2 group-hover:text-accent transition-colors">{m.title}</div>
        {meta && <div className="text-[12px] text-muted mt-0.5 truncate">{meta}</div>}
      </div>
    </Link>
  );
}

function Row({ m, services, index }: { m: Item; services: Options['services']; index: number }) {
  const svc = m.services.map((id) => services.find((s) => s.id === id)).filter(Boolean) as Options['services'];
  return (
    <Link href={`/movie/${m.slug}`} className="group flex gap-4 py-4 border-b border-line last:border-b-0">
      <span className="hidden sm:block w-6 pt-1 text-[13px] text-muted tabular-nums text-right flex-none">{index + 1}.</span>
      <div className="relative w-[68px] aspect-[2/3] rounded-sm overflow-hidden bg-surface ring-1 ring-line flex-none">
        {m.poster ? <img src={m.poster} alt="" loading="lazy" className="w-full h-full object-cover" /> : null}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <div className="text-[15px] font-semibold text-ink group-hover:text-accent transition-colors leading-snug">
              {m.title} {m.year && <span className="font-normal text-muted">({m.year})</span>}
            </div>
            {m.originalTitle && m.originalTitle !== m.title && <div className="text-[12px] text-muted truncate">{m.originalTitle}</div>}
          </div>
          <div className="flex-none text-right">
            <Rating m={m} />
            {m.votes > 0 && <div className="text-[11px] text-muted mt-1 tabular-nums">{m.votes.toLocaleString('cs-CZ')} hl.</div>}
          </div>
        </div>
        <div className="text-[12.5px] text-muted mt-1">
          {[valueLabel(m.contentType), m.genres.slice(0, 3).map(valueLabel).join(' / '), m.countries.slice(0, 2).map(valueLabel).join(', '), m.runtime ? `${m.runtime} min` : null]
            .filter(Boolean)
            .join(' · ')}
        </div>
        {(m.directors.length > 0 || m.cast.length > 0) && (
          <div className="text-[12.5px] text-muted mt-1 line-clamp-1">
            {m.directors.length > 0 && (
              <>
                Režie: <span className="text-ink">{m.directors.join(', ')}</span>
              </>
            )}
            {m.directors.length > 0 && m.cast.length > 0 && <span className="mx-1.5">·</span>}
            {m.cast.length > 0 && (
              <>
                Hrají: <span className="text-ink">{m.cast.join(', ')}</span>
              </>
            )}
          </div>
        )}
        {(svc.length > 0 || m.nowShowing || m.watched) && (
          <div className="flex flex-wrap items-center gap-1.5 mt-2">
            {m.nowShowing && <span className="text-[11px] font-semibold border border-line rounded-sm px-1.5 py-px text-ink">V kině</span>}
            {svc.map((s) => (
              <span key={s.id} className="inline-flex items-center gap-1 text-[11px] font-semibold border border-line rounded-sm px-1.5 py-px text-ink">
                <span className="w-2 h-2 rounded-[2px]" style={{ backgroundColor: s.color || '#888' }} />
                {s.name}
              </span>
            ))}
            {m.watched && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted">
                <Icon name="check" size={12} strokeWidth={2.4} /> Viděno
              </span>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}

// ---------------------------------------------------------------------------

export default function MovieFilterExplorer({ loggedIn }: { loggedIn: boolean }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setHasInput } = useFilterFormState();

  const [s, setS] = useState<State>(() => applyParams(EMPTY, searchParams ? Array.from(new URLSearchParams(searchParams.toString()).entries()) : []));
  const [options, setOptions] = useState<Options | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [facets, setFacets] = useState<Facets | null>(null);
  const [total, setTotal] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [limited, setLimited] = useState(false);
  const [activeCount, setActiveCount] = useState(0);
  const [similarTo, setSimilarTo] = useState<{ id: string; title: string; year: string | null } | null>(null);
  const [didYouMean, setDidYouMean] = useState<Array<{ title: string; slug: string; year: string | null }>>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [allGenres, setAllGenres] = useState(false);
  const [allCountries, setAllCountries] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');
  const [saved, setSaved] = useState<Array<{ name: string; qs: string }>>([]);
  const [saveName, setSaveName] = useState('');
  const [collectionsOpen, setCollectionsOpen] = useState(false);
  const [tip, setTip] = useState<Item | null | 'loading'>(null);
  const reqId = useRef(0);
  const sentinel = useRef<HTMLDivElement | null>(null);
  const loadMoreRef = useRef<() => void>(() => {});

  const qs = useMemo(() => toParams(s).toString(), [s]);

  useEffect(() => {
    fetch('/api/movie-filter/options')
      .then((r) => r.json())
      .then(setOptions)
      .catch(() => {});
    setSaved(readLS(SAVED_KEY, []));
    setView(readLS<'grid' | 'list'>('kf_filter_view', 'grid'));
  }, []);

  useEffect(() => {
    const id = ++reqId.current;
    setLoading(true);
    const t = setTimeout(() => {
      fetch(`/api/movie-filter?${qs}${qs ? '&' : ''}facets=1&page=1`, { cache: 'no-store' })
        .then((r) => r.json())
        .then((d) => {
          if (id !== reqId.current) return;
          setItems(d.items || []);
          setFacets(d.facets || null);
          setTotal(d.total ?? 0);
          setPage(d.page || 1);
          setPages(d.pages || 1);
          setLimited(!!d.limited);
          setActiveCount(d.activeCount || 0);
          setSimilarTo(d.similarTo || null);
          setDidYouMean(d.didYouMean || []);
        })
        .catch(() => {})
        .finally(() => id === reqId.current && setLoading(false));
      router.replace(qs ? `/recenzie/filter?${qs}` : '/recenzie/filter', { scroll: false });
    }, 250);
    return () => clearTimeout(t);
  }, [qs]);

  useEffect(() => {
    setHasInput(activeCount > 0);
    return () => setHasInput(false);
  }, [activeCount, setHasInput]);

  async function loadMore() {
    if (loadingMore || loading || page >= pages) return;
    setLoadingMore(true);
    try {
      const r = await fetch(`/api/movie-filter?${qs}${qs ? '&' : ''}page=${page + 1}`, { cache: 'no-store' });
      const d = await r.json();
      setItems((prev) => [...prev, ...(d.items || [])]);
      setPage(d.page || page + 1);
    } finally {
      setLoadingMore(false);
    }
  }
  loadMoreRef.current = loadMore;

  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => entries[0].isIntersecting && loadMoreRef.current(), { rootMargin: '600px' });
    io.observe(el);
    return () => io.disconnect();
  }, [items.length]);

  const set = <K extends keyof State>(k: K, v: State[K]) => setS((prev) => ({ ...prev, [k]: v }));
  const toggleIn = (k: ListKey, v: string) => setS((prev) => ({ ...prev, [k]: prev[k].includes(v) ? prev[k].filter((x) => x !== v) : [...prev[k], v] }));
  function cycle(inc: 'genres' | 'countries', exc: 'exGenres' | 'exCountries', v: string) {
    setS((prev) => {
      if (prev[inc].includes(v)) return { ...prev, [inc]: prev[inc].filter((x) => x !== v), [exc]: [...prev[exc], v] };
      if (prev[exc].includes(v)) return { ...prev, [exc]: prev[exc].filter((x) => x !== v) };
      return { ...prev, [inc]: [...prev[inc], v] };
    });
  }
  const reset = () => setS({ ...EMPTY });
  function applyPreset(params: Record<string, string>) {
    setS(applyParams({ ...EMPTY }, Object.entries(params)));
    setCollectionsOpen(false);
  }
  function applyQs(q: string) {
    setS(applyParams({ ...EMPTY }, Array.from(new URLSearchParams(q).entries())));
    setCollectionsOpen(false);
  }
  function saveCurrent() {
    const name = (saveName.trim() || `Filtr ${saved.length + 1}`).slice(0, 60);
    const next = [{ name, qs }, ...saved.filter((x) => x.name !== name)].slice(0, 20);
    setSaved(next);
    writeLS(SAVED_KEY, next);
    setSaveName('');
  }
  function removeSaved(name: string) {
    const next = saved.filter((x) => x.name !== name);
    setSaved(next);
    writeLS(SAVED_KEY, next);
  }
  async function randomTip() {
    setTip('loading');
    try {
      const r = await fetch(`/api/movie-filter?${qs}${qs ? '&' : ''}random=1`, { cache: 'no-store' });
      const d = await r.json();
      setTip(d.items?.[0] || null);
    } catch {
      setTip(null);
    }
  }
  function changeView(v: 'grid' | 'list') {
    setView(v);
    writeLS('kf_filter_view', v);
  }

  const genreList = useMemo(() => {
    if (!options) return [];
    const all = Object.keys(options.genres).sort((a, b) => valueLabel(a).localeCompare(valueLabel(b), 'cs'));
    const selected = all.filter((g) => s.genres.includes(g) || s.exGenres.includes(g));
    const rest = all.filter((g) => !selected.includes(g));
    const top = Object.keys(options.genres)
      .sort((a, b) => (options.genres[b] || 0) - (options.genres[a] || 0))
      .slice(0, 12);
    return [...selected, ...(allGenres ? rest : rest.filter((g) => top.includes(g)))];
  }, [options, allGenres, s.genres, s.exGenres]);

  const countryList = useMemo(() => {
    if (!options) return [];
    const q = countrySearch.trim().toLowerCase();
    const all = Object.keys(options.countries);
    const filtered = q ? all.filter((c) => valueLabel(c).toLowerCase().includes(q) || c.toLowerCase().includes(q)) : all;
    const selected = [...s.countries, ...s.exCountries];
    const rest = filtered.filter((c) => !selected.includes(c));
    return [...selected, ...(allCountries || q ? rest : rest.slice(0, 10))];
  }, [options, countrySearch, allCountries, s.countries, s.exCountries]);

  const activePreset = FILTER_PRESETS.find((p) => toParams(applyParams({ ...EMPTY }, Object.entries(p.params))).toString() === qs);

  const tags: Array<{ label: string; clear: () => void }> = [];
  if (activePreset) tags.push({ label: activePreset.label.cs, clear: reset });
  else {
    if (s.similar) tags.push({ label: `Podobné jako: ${similarTo?.title || '…'}`, clear: () => setS((p) => ({ ...p, similar: '', sort: p.sort === 'similar' ? 'popular' : p.sort })) });
    if (s.q.trim()) tags.push({ label: `Název: ${s.q.trim()}`, clear: () => set('q', '') });
    s.types.forEach((v) => tags.push({ label: valueLabel(v), clear: () => toggleIn('types', v) }));
    s.genres.forEach((v) => tags.push({ label: valueLabel(v), clear: () => toggleIn('genres', v) }));
    s.exGenres.forEach((v) => tags.push({ label: `Bez: ${valueLabel(v)}`, clear: () => toggleIn('exGenres', v) }));
    const cPrefix = s.countriesMode === 'primary' ? 'Původ: ' : s.countriesMode === 'secondary' ? 'Stopa: ' : '';
    s.countries.forEach((v) => tags.push({ label: `${cPrefix}${valueLabel(v)}`, clear: () => toggleIn('countries', v) }));
    s.exCountries.forEach((v) => tags.push({ label: `Bez: ${valueLabel(v)}`, clear: () => toggleIn('exCountries', v) }));
    if (s.yearFrom || s.yearTo) tags.push({ label: `${s.yearFrom || '…'} – ${s.yearTo || '…'}`, clear: () => setS((p) => ({ ...p, yearFrom: '', yearTo: '' })) });
    if (s.ratingFrom || s.ratingTo) tags.push({ label: `Hodnocení ${s.ratingFrom || 0}–${s.ratingTo || 100} %`, clear: () => setS((p) => ({ ...p, ratingFrom: '', ratingTo: '' })) });
    if (s.lenFrom || s.lenTo) tags.push({ label: `${s.lenFrom || 0}–${s.lenTo || '∞'} min`, clear: () => setS((p) => ({ ...p, lenFrom: '', lenTo: '' })) });
    if (s.minVotes) tags.push({ label: `Min. ${Number(s.minVotes).toLocaleString('cs-CZ')} hlasů`, clear: () => set('minVotes', '') });
    if (s.maxVotes) tags.push({ label: 'Méně známé', clear: () => set('maxVotes', '') });
    if (s.addedDays) tags.push({ label: 'Nově přidané', clear: () => set('addedDays', '') });
    s.services.forEach((id) => tags.push({ label: options?.services.find((x) => x.id === id)?.name || 'Služba', clear: () => toggleIn('services', id) }));
    const flagLabels: Record<FlagKey, string> = {
      cinema: 'V kinech',
      online: 'Online',
      subs: 'Titulky',
      dub: 'Dabing',
      hideSeen: 'Bez viděných',
      onlySeen: 'Jen viděné',
      onlyWatchlist: 'Chci vidět',
      hasReviews: 'S recenzemi',
      hasGallery: 'S galerií',
      hasVideos: 'S videi',
      hasTrivia: 'Se zajímavostmi',
      upcoming: 'Chystá se',
      noCam: 'Bez CAM'
    };
    FLAG_KEYS.forEach((k) => s[k] && tags.push({ label: flagLabels[k], clear: () => set(k, false) }));
    PEOPLE.forEach((p) => s[p.key] && tags.push({ label: `${p.label}: ${s[p.key]}`, clear: () => set(p.key, '') }));
    s.actors.forEach((a) => tags.push({ label: `Hraje: ${a}`, clear: () => toggleIn('actors', a) }));
    s.keywords.forEach((k) => tags.push({ label: k, clear: () => toggleIn('keywords', k) }));
  }

  const f = facets;
  const yearMin = options?.yearMin ?? 1920;
  const yearMax = options?.yearMax ?? new Date().getFullYear() + 2;
  const lenMax = Math.min(300, Math.max(180, options?.runtimeMax ?? 240));

  const panel = (
    <div>
      <Section title="Typ" count={s.types.length}>
        {options && Object.keys(options.types).map((t) => <CheckRow key={t} label={valueLabel(t)} count={f?.types[t] ?? 0} state={s.types.includes(t) ? 'on' : 'off'} onClick={() => toggleIn('types', t)} />)}
      </Section>

      <Section title="Žánr" count={s.genres.length + s.exGenres.length}>
        <div className="flex text-[12px] font-medium bg-surface border border-line rounded-md p-0.5 mb-2.5">
          {(['any', 'all'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => set('genresMode', mode)}
              className={`flex-1 rounded-[5px] py-1 transition-colors ${s.genresMode === mode ? 'bg-card text-ink shadow-sm' : 'text-muted hover:text-ink'}`}
            >
              {mode === 'any' ? 'Kterýkoli' : 'Všechny zvolené'}
            </button>
          ))}
        </div>
        {genreList.map((g) => (
          <CheckRow
            key={g}
            label={valueLabel(g)}
            count={f?.genres[g] ?? 0}
            state={s.genres.includes(g) ? 'on' : s.exGenres.includes(g) ? 'ex' : 'off'}
            onClick={() => cycle('genres', 'exGenres', g)}
          />
        ))}
        {options && Object.keys(options.genres).length > 12 && (
          <button type="button" onClick={() => setAllGenres(!allGenres)} className="text-[12px] font-semibold text-accent mt-1.5 hover:underline">
            {allGenres ? 'Zobrazit méně' : `Všechny žánry (${Object.keys(options.genres).length})`}
          </button>
        )}
        <p className="text-[11px] text-muted mt-2">Druhým kliknutím žánr vyloučíte.</p>
      </Section>

      <Section title="Rok vydání" count={s.yearFrom || s.yearTo ? 1 : 0}>
        <DualRange min={yearMin} max={yearMax} from={s.yearFrom} to={s.yearTo} onChange={(a, b) => setS((p) => ({ ...p, yearFrom: a, yearTo: b }))} />
        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-3">
          {DECADES.map((d) => {
            const on = s.yearFrom === (d.from ? String(d.from) : '') && s.yearTo === (d.to ? String(d.to) : '');
            return (
              <button
                key={d.label}
                type="button"
                onClick={() => setS((p) => (on ? { ...p, yearFrom: '', yearTo: '' } : { ...p, yearFrom: d.from ? String(d.from) : '', yearTo: d.to ? String(d.to) : '' }))}
                className={`text-[12px] ${on ? 'text-accent font-semibold' : 'text-muted hover:text-ink'}`}
              >
                {d.label}
              </button>
            );
          })}
        </div>
      </Section>

      <Section title="Hodnocení" count={(s.ratingFrom || s.ratingTo ? 1 : 0) + (s.minVotes ? 1 : 0) + (s.maxVotes ? 1 : 0)}>
        <DualRange min={0} max={100} step={5} from={s.ratingFrom} to={s.ratingTo} format={(v) => `${v} %`} onChange={(a, b) => setS((p) => ({ ...p, ratingFrom: a, ratingTo: b }))} />
        <label className="block text-[12px] text-muted mt-4 mb-1.5">Počet hodnocení</label>
        <select
          value={s.minVotes}
          onChange={(e) => set('minVotes', e.target.value)}
          className="w-full bg-surface border border-line rounded-md px-2.5 py-2 text-[13px] text-ink outline-none focus:border-accent"
        >
          {VOTES.map((v) => (
            <option key={v.label} value={v.value}>
              {v.label}
            </option>
          ))}
        </select>
        <div className="mt-2">
          <Switch label="Jen méně známé tituly" hint="Do 20 000 hodnocení" checked={!!s.maxVotes} onChange={(v) => set('maxVotes', v ? '20000' : '')} />
        </div>
      </Section>

      <Section title="Kde sledovat" count={s.services.length + [s.cinema, s.online, s.subs, s.dub, s.noCam].filter(Boolean).length}>
        {options?.services.map((sv) => (
          <CheckRow key={sv.id} label={sv.name} color={sv.color} count={f?.services[sv.id] ?? 0} state={s.services.includes(sv.id) ? 'on' : 'off'} onClick={() => toggleIn('services', sv.id)} />
        ))}
        <div className={options?.services.length ? 'mt-2 pt-2 border-t border-line' : ''}>
          <Switch label="Právě v kinech" checked={s.cinema} onChange={(v) => set('cinema', v)} />
          <Switch label="Online" checked={s.online} onChange={(v) => set('online', v)} />
          <Switch label="S titulky" checked={s.subs} onChange={(v) => set('subs', v)} />
          <Switch label="S dabingem" checked={s.dub} onChange={(v) => set('dub', v)} />
          <Switch label="Skrýt CAM verze" checked={s.noCam} onChange={(v) => set('noCam', v)} />
        </div>
      </Section>

      <Section title="Délka" count={s.lenFrom || s.lenTo ? 1 : 0} defaultOpen={false}>
        <DualRange min={0} max={lenMax} step={5} from={s.lenFrom} to={s.lenTo} format={(v) => (v >= lenMax ? `${lenMax}+ min` : `${v} min`)} onChange={(a, b) => setS((p) => ({ ...p, lenFrom: a, lenTo: b }))} />
      </Section>

      <Section title="Země původu" count={s.countries.length + s.exCountries.length} defaultOpen={false}>
        <div className="flex text-[12px] font-medium bg-surface border border-line rounded-md p-0.5 mb-2.5">
          {([
            ['any', 'Jakákoli účast'],
            ['primary', 'Hlavní země'],
            ['secondary', 'Jen stopa']
          ] as const).map(([mode, label]) => (
            <button
              key={mode}
              type="button"
              onClick={() => set('countriesMode', mode)}
              title={mode === 'primary' ? 'Země, odkud film skutečně pochází (domácí tvorba)' : mode === 'secondary' ? 'Zahraniční filmy s koprodukcí nebo natáčením v dané zemi' : 'Země se na filmu jakkoli podílela'}
              className={`flex-1 rounded-[5px] py-1 transition-colors ${s.countriesMode === mode ? 'bg-card text-ink shadow-sm' : 'text-muted hover:text-ink'}`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="relative mb-2">
          <Icon name="search" size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
          <input
            value={countrySearch}
            onChange={(e) => setCountrySearch(e.target.value)}
            placeholder="Hledat zemi"
            className="w-full bg-surface border border-line rounded-md pl-8 pr-3 py-1.5 text-[13px] text-ink placeholder:text-muted outline-none focus:border-accent"
          />
        </div>
        {countryList.map((c) => (
          <CheckRow
            key={c}
            label={valueLabel(c)}
            count={f?.countries[c] ?? 0}
            state={s.countries.includes(c) ? 'on' : s.exCountries.includes(c) ? 'ex' : 'off'}
            onClick={() => cycle('countries', 'exCountries', c)}
          />
        ))}
        {!countrySearch && options && Object.keys(options.countries).length > 10 && (
          <button type="button" onClick={() => setAllCountries(!allCountries)} className="text-[12px] font-semibold text-accent mt-1.5 hover:underline">
            {allCountries ? 'Zobrazit méně' : `Všechny země (${Object.keys(options.countries).length})`}
          </button>
        )}
      </Section>

      <Section title="Tvůrci a herci" count={PEOPLE.filter((p) => s[p.key]).length + s.actors.length} defaultOpen={false}>
        <div className="space-y-3">
          <div>
            <label className="block text-[12px] text-muted mb-1">Herec / herečka</label>
            <Suggest kind="actor" placeholder="Zadejte jméno" onPick={(n) => !s.actors.includes(n) && set('actors', [...s.actors, n])} />
            {s.actors.map((a) => (
              <div key={a} className="flex items-center justify-between text-[13px] text-ink mt-1.5 pl-1">
                {a}
                <button type="button" onClick={() => toggleIn('actors', a)} className="text-muted hover:text-ink" aria-label="Odebrat">
                  <Icon name="x" size={14} />
                </button>
              </div>
            ))}
          </div>
          {PEOPLE.map((p) => (
            <div key={p.key}>
              <label className="block text-[12px] text-muted mb-1">{p.label}</label>
              <Suggest kind={p.kind} placeholder="Zadejte jméno" value={s[p.key]} onChange={(v) => set(p.key, v)} onPick={(n) => set(p.key, n)} />
            </div>
          ))}
        </div>
      </Section>

      <Section title="Podobné jako" count={s.similar ? 1 : 0} defaultOpen={false}>
        <Suggest kind="title" placeholder="Název filmu nebo seriálu" onPick={(_, item) => item?.id && setS((p) => ({ ...p, similar: item.id, sort: 'popular' }))} />
        {s.similar && similarTo && (
          <div className="flex items-center justify-between text-[13px] text-ink mt-2 pl-1">
            {similarTo.title}
            <button type="button" onClick={() => setS((p) => ({ ...p, similar: '' }))} className="text-muted hover:text-ink" aria-label="Zrušit">
              <Icon name="x" size={14} />
            </button>
          </div>
        )}
      </Section>

      <Section title="Klíčová slova" count={s.keywords.length} defaultOpen={false}>
        <Suggest kind="keyword" placeholder="např. vesmír, pomsta" onPick={(n) => !s.keywords.includes(n) && set('keywords', [...s.keywords, n])} />
        {s.keywords.map((k) => (
          <div key={k} className="flex items-center justify-between text-[13px] text-ink mt-1.5 pl-1">
            {k}
            <button type="button" onClick={() => toggleIn('keywords', k)} className="text-muted hover:text-ink" aria-label="Odebrat">
              <Icon name="x" size={14} />
            </button>
          </div>
        ))}
      </Section>

      {loggedIn && (
        <Section title="Můj seznam" count={[s.hideSeen, s.onlySeen, s.onlyWatchlist].filter(Boolean).length} defaultOpen={false}>
          <Switch label="Skrýt zhlédnuté" checked={s.hideSeen} onChange={(v) => setS((p) => ({ ...p, hideSeen: v, onlySeen: v ? false : p.onlySeen }))} />
          <Switch label="Jen zhlédnuté" checked={s.onlySeen} onChange={(v) => setS((p) => ({ ...p, onlySeen: v, hideSeen: v ? false : p.hideSeen }))} />
          <Switch label="Jen „Chci vidět“" checked={s.onlyWatchlist} onChange={(v) => set('onlyWatchlist', v)} />
        </Section>
      )}

      <Section title="Další možnosti" count={[s.upcoming, s.hasReviews, s.hasGallery, s.hasVideos, s.hasTrivia].filter(Boolean).length + (s.addedDays ? 1 : 0)} defaultOpen={false}>
        <Switch label="Připravované premiéry" checked={s.upcoming} onChange={(v) => set('upcoming', v)} />
        <Switch label="Nově přidané (30 dní)" checked={!!s.addedDays} onChange={(v) => set('addedDays', v ? '30' : '')} />
        <Switch label="S recenzemi" checked={s.hasReviews} onChange={(v) => set('hasReviews', v)} />
        <Switch label="S galerií" checked={s.hasGallery} onChange={(v) => set('hasGallery', v)} />
        <Switch label="S videi" checked={s.hasVideos} onChange={(v) => set('hasVideos', v)} />
        <Switch label="Se zajímavostmi" checked={s.hasTrivia} onChange={(v) => set('hasTrivia', v)} />
      </Section>
    </div>
  );

  const btn = 'inline-flex items-center gap-2 h-10 px-3.5 rounded-md border border-line bg-surface text-[13px] font-semibold text-ink hover:border-muted transition-colors';

  return (
    <div className="border border-line border-t-0 rounded-b bg-card">
      <style>{`
        .kf-range::-webkit-slider-thumb{pointer-events:auto;-webkit-appearance:none;appearance:none;width:16px;height:16px;border-radius:9999px;background:#fff;border:2px solid currentColor;box-shadow:0 1px 3px rgba(0,0,0,.3);cursor:pointer}
        .kf-range::-moz-range-thumb{pointer-events:auto;width:13px;height:13px;border-radius:9999px;background:#fff;border:2px solid currentColor;box-shadow:0 1px 3px rgba(0,0,0,.3);cursor:pointer}
        .kf-range::-webkit-slider-runnable-track{background:transparent}
        .kf-range::-moz-range-track{background:transparent}
      `}</style>

      {/* Horná lišta */}
      <div className="px-4 py-3 border-b border-line flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Icon name="search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            value={s.q}
            onChange={(e) => set('q', e.target.value)}
            placeholder="Hledat podle názvu"
            className="w-full h-10 bg-surface border border-line rounded-md pl-9 pr-9 text-[14px] text-ink placeholder:text-muted outline-none focus:border-accent"
          />
          {s.q && (
            <button type="button" onClick={() => set('q', '')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-ink" aria-label="Vymazat">
              <Icon name="x" size={15} />
            </button>
          )}
        </div>

        <div className="relative">
          <button type="button" onClick={() => setCollectionsOpen(!collectionsOpen)} className={`${btn} ${activePreset ? 'border-accent text-accent' : ''}`}>
            <Icon name="layers" size={16} />
            Kolekce
            <Icon name="chevron" size={14} className={`text-muted transition-transform ${collectionsOpen ? 'rotate-180' : ''}`} />
          </button>
          {collectionsOpen && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setCollectionsOpen(false)} />
              <div className="absolute right-0 z-40 mt-1.5 w-[360px] max-w-[calc(100vw-2rem)] bg-card border border-line rounded-lg shadow-2xl overflow-hidden">
                <div className="max-h-[70vh] overflow-y-auto">
                  <div className="px-4 pt-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted">Kolekce</div>
                  {FILTER_PRESETS.map((p) => (
                    <button
                      key={p.key}
                      type="button"
                      onClick={() => applyPreset(p.params)}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-surface transition-colors ${activePreset?.key === p.key ? 'bg-surface' : ''}`}
                    >
                      <span className={`w-9 h-9 rounded-md border flex items-center justify-center flex-none ${activePreset?.key === p.key ? 'border-accent text-accent' : 'border-line text-ink'}`}>
                        <Icon name={p.icon} size={17} />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-[13.5px] font-semibold text-ink">{p.label.cs}</span>
                        <span className="block text-[12px] text-muted truncate">{p.desc.cs}</span>
                      </span>
                    </button>
                  ))}
                  <div className="border-t border-line mt-1.5 px-4 pt-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted">Uložené filtry</div>
                  <div className="px-4 pb-2 flex gap-2">
                    <input
                      value={saveName}
                      onChange={(e) => setSaveName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && activeCount > 0 && saveCurrent()}
                      placeholder={activeCount > 0 ? 'Název filtru' : 'Nastavte filtr a uložte jej'}
                      disabled={activeCount === 0}
                      className="flex-1 min-w-0 h-9 bg-surface border border-line rounded-md px-2.5 text-[13px] text-ink placeholder:text-muted outline-none focus:border-accent disabled:opacity-60"
                    />
                    <button type="button" onClick={saveCurrent} disabled={activeCount === 0} className="h-9 px-3 rounded-md bg-accent text-white text-[13px] font-semibold disabled:opacity-40 inline-flex items-center gap-1.5">
                      <Icon name="bookmark" size={14} /> Uložit
                    </button>
                  </div>
                  {saved.map((x) => (
                    <div key={x.name} className="flex items-center hover:bg-surface">
                      <button type="button" onClick={() => applyQs(x.qs)} className="flex-1 min-w-0 flex items-center gap-2.5 px-4 py-2 text-left text-[13px] text-ink">
                        <Icon name="bookmark" size={15} className="text-muted" />
                        <span className="truncate">{x.name}</span>
                      </button>
                      <button type="button" onClick={() => removeSaved(x.name)} className="px-4 py-2 text-muted hover:text-danger" aria-label="Smazat">
                        <Icon name="trash" size={15} />
                      </button>
                    </div>
                  ))}
                  <div className="h-2" />
                </div>
              </div>
            </>
          )}
        </div>

        <button type="button" onClick={randomTip} className={btn}>
          <Icon name="shuffle" size={16} />
          Tip na film
        </button>

        <button type="button" onClick={() => setDrawer(true)} className={`${btn} lg:hidden`}>
          <Icon name="sliders" size={16} />
          Filtry
          {activeCount ? <span className="min-w-[18px] h-[18px] rounded-full bg-accent text-white text-[11px] flex items-center justify-center px-1">{activeCount}</span> : null}
        </button>
      </div>

      <div className="lg:grid lg:grid-cols-[272px_1fr]">
        <aside className="hidden lg:block border-r border-line px-4 max-h-[calc(100vh-96px)] overflow-y-auto sticky top-16 self-start">
          <div className="flex items-center justify-between pt-3.5 pb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">Filtry</span>
            {activeCount > 0 && (
              <button type="button" onClick={reset} className="text-[12px] font-semibold text-accent hover:underline">
                Vymazat vše
              </button>
            )}
          </div>
          {panel}
        </aside>

        <section className="px-4 sm:px-5 py-4 min-w-0">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="text-[13px] text-muted">
              {total === null ? (
                'Načítám…'
              ) : (
                <>
                  {similarTo && (
                    <>
                      Podobné jako <span className="text-ink font-semibold">{similarTo.title}</span>
                      <span className="mx-1.5">·</span>
                    </>
                  )}
                  <span className="text-ink font-semibold tabular-nums">{total.toLocaleString('cs-CZ')}</span> titulů
                </>
              )}
              {loading && total !== null && <span className="ml-2 inline-block w-3 h-3 rounded-full border-2 border-accent border-t-transparent animate-spin align-middle" />}
            </div>
            <div className="flex items-center gap-2">
              <label className="text-[12px] text-muted hidden sm:block">Řadit podle</label>
              <select value={s.sort} onChange={(e) => set('sort', e.target.value)} className="h-8 bg-surface border border-line rounded-md px-2 text-[13px] font-medium text-ink outline-none focus:border-accent">
                {Object.entries(SORT_LABELS)
                  .filter(([k]) => k !== 'similar' || s.similar)
                  .map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
              </select>
              <div className="flex border border-line rounded-md overflow-hidden">
                {(['grid', 'list'] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => changeView(v)}
                    className={`w-8 h-8 flex items-center justify-center transition-colors ${view === v ? 'bg-ink text-card' : 'bg-surface text-muted hover:text-ink'}`}
                    aria-label={v === 'grid' ? 'Mřížka' : 'Seznam'}
                    title={v === 'grid' ? 'Mřížka' : 'Seznam'}
                  >
                    <Icon name={v} size={15} />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {tags.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 mt-3">
              {tags.map((c, i) => (
                <span key={i} className="inline-flex items-center gap-1 h-7 pl-2.5 pr-1 rounded-md border border-line bg-surface text-[12px] font-medium text-ink">
                  {c.label}
                  <button type="button" onClick={c.clear} className="w-5 h-5 flex items-center justify-center rounded text-muted hover:text-ink hover:bg-line/60" aria-label="Odebrat">
                    <Icon name="x" size={12} strokeWidth={2.2} />
                  </button>
                </span>
              ))}
              <button type="button" onClick={reset} className="text-[12px] font-semibold text-muted hover:text-ink px-1.5">
                Vymazat vše
              </button>
            </div>
          )}

          <div className="mt-4">
            {!loading && total === 0 ? (
              <div className="border border-line rounded-lg py-12 px-6 text-center">
                <Icon name="search" size={28} className="mx-auto text-muted mb-3" strokeWidth={1.4} />
                <div className="text-[15px] font-semibold text-ink">Žádné výsledky</div>
                {didYouMean.length > 0 ? (
                  <div className="mt-3">
                    <p className="text-[13px] text-muted mb-2">Mysleli jste:</p>
                    <div className="flex flex-wrap justify-center gap-x-4 gap-y-1">
                      {didYouMean.map((d) => (
                        <button key={d.slug} type="button" onClick={() => set('q', d.title)} className="text-[13px] font-semibold text-accent hover:underline">
                          {d.title}
                          {d.year ? <span className="text-muted font-normal"> ({d.year})</span> : null}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-[13px] text-muted mt-1">Zkuste uvolnit některé z nastavených filtrů.</p>
                )}
              </div>
            ) : view === 'grid' ? (
              <div className={`grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-x-4 gap-y-6 transition-opacity ${loading ? 'opacity-50' : ''}`}>
                {items.map((m) => (
                  <Card key={m.id} m={m} />
                ))}
              </div>
            ) : (
              <div className={`transition-opacity ${loading ? 'opacity-50' : ''}`}>
                {items.map((m, i) => (
                  <Row key={m.id} m={m} index={i} services={options?.services || []} />
                ))}
              </div>
            )}
            <div ref={sentinel} className="h-1" />
            {loadingMore && (
              <div className="flex justify-center py-6">
                <span className="w-5 h-5 rounded-full border-2 border-accent border-t-transparent animate-spin" />
              </div>
            )}
            {limited && page >= pages && (
              <div className="mt-6 border border-line rounded-lg p-4 flex items-center gap-4">
                <img src="/golden-ticket-badge.svg" alt="" width={32} height={32} className="flex-none" />
                <div className="text-[13px]">
                  <span className="text-ink font-semibold">Další výsledky jsou dostupné členům Golden Ticket. </span>
                  <Link href="/nastavenia/clenstvo" className="text-accent font-semibold hover:underline">
                    Zjistit více
                  </Link>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Mobil — panel filtrov */}
      {drawer && (
        <div className="lg:hidden fixed inset-0 z-[90] flex">
          <div className="absolute inset-0 bg-black/60" onClick={() => setDrawer(false)} />
          <div className="relative ml-auto w-full max-w-sm h-full bg-card flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-4 h-14 border-b border-line">
              <span className="text-[15px] font-semibold text-ink">Filtry</span>
              <div className="flex items-center gap-4">
                {activeCount > 0 && (
                  <button type="button" onClick={reset} className="text-[13px] font-semibold text-accent">
                    Vymazat vše
                  </button>
                )}
                <button type="button" onClick={() => setDrawer(false)} className="text-ink" aria-label="Zavřít">
                  <Icon name="x" size={20} />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-4">{panel}</div>
            <div className="p-4 border-t border-line">
              <button type="button" onClick={() => setDrawer(false)} className="w-full h-11 bg-accent text-white rounded-md text-[14px] font-semibold">
                {total === null ? 'Zobrazit výsledky' : `Zobrazit ${total.toLocaleString('cs-CZ')} titulů`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tip na film */}
      {tip !== null && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={() => setTip(null)} />
          <div className="relative w-full max-w-[560px] rounded-xl overflow-hidden bg-card border border-line shadow-2xl">
            {tip !== 'loading' && tip?.poster && <img src={tip.poster} alt="" className="absolute inset-0 w-full h-full object-cover opacity-20 blur-2xl scale-110" />}
            <div className="relative p-5 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted">
                  <Icon name="shuffle" size={14} /> Tip na film
                </span>
                <button type="button" onClick={() => setTip(null)} className="text-muted hover:text-ink" aria-label="Zavřít">
                  <Icon name="x" size={18} />
                </button>
              </div>
              {tip === 'loading' ? (
                <div className="flex gap-5 animate-pulse">
                  <div className="w-32 sm:w-40 aspect-[2/3] rounded-md bg-line" />
                  <div className="flex-1 space-y-3 pt-1">
                    <div className="h-6 bg-line rounded w-3/4" />
                    <div className="h-4 bg-line rounded w-1/2" />
                    <div className="h-8 bg-line rounded w-16" />
                  </div>
                </div>
              ) : tip ? (
                <div className="flex gap-5">
                  <Link href={`/movie/${tip.slug}`} className="w-32 sm:w-40 aspect-[2/3] rounded-md overflow-hidden bg-surface ring-1 ring-line flex-none shadow-xl">
                    {tip.poster ? <img src={tip.poster} alt="" className="w-full h-full object-cover" /> : null}
                  </Link>
                  <div className="min-w-0 flex-1 flex flex-col">
                    <h3 className="text-xl sm:text-2xl font-bold text-ink leading-tight">{tip.title}</h3>
                    {tip.originalTitle && tip.originalTitle !== tip.title && <div className="text-[13px] text-muted mt-0.5">{tip.originalTitle}</div>}
                    <div className="text-[13px] text-muted mt-2">{[tip.year, tip.runtime ? `${tip.runtime} min` : null, tip.countries.slice(0, 2).map(valueLabel).join(', ')].filter(Boolean).join(' · ')}</div>
                    <div className="text-[13px] text-ink mt-1">{tip.genres.slice(0, 3).map(valueLabel).join(' / ')}</div>
                    <div className="mt-3">
                      <Rating m={tip} size="lg" />
                    </div>
                    {tip.directors.length > 0 && (
                      <div className="text-[12.5px] text-muted mt-3">
                        Režie: <span className="text-ink">{tip.directors.join(', ')}</span>
                      </div>
                    )}
                    {tip.cast.length > 0 && (
                      <div className="text-[12.5px] text-muted mt-0.5 line-clamp-2">
                        Hrají: <span className="text-ink">{tip.cast.join(', ')}</span>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-[14px] text-muted py-6 text-center">Pro aktuální filtr jsme nic nenašli.</p>
              )}
              <div className="flex gap-2 mt-6">
                <button type="button" onClick={randomTip} className="flex-1 h-11 inline-flex items-center justify-center gap-2 rounded-md border border-line bg-surface text-[14px] font-semibold text-ink hover:border-muted">
                  <Icon name="shuffle" size={16} /> Další tip
                </button>
                {tip && tip !== 'loading' && (
                  <Link href={`/movie/${tip.slug}`} className="flex-1 h-11 inline-flex items-center justify-center gap-2 rounded-md bg-accent text-white text-[14px] font-semibold">
                    Detail filmu <Icon name="chevronRight" size={16} />
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
