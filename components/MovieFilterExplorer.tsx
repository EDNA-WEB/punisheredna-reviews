'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { valueLabel } from '@/lib/valueLabels';
import { FILTER_PRESETS } from '@/lib/filterPresets';
import { useFilterFormState } from './FilterFormState';

// ---------------------------------------------------------------------------
// FILTER FILMOV A SERIÁLOV (web), verzia 2:
//  • chytré hľadanie vetou („komedie z 90. let s Jimem Carreym nad 70 %“)
//  • hotové predvoľby (Skryté perly, Kultovka, Na rande…)
//  • uložené filtre a história posledných hľadaní
//  • „Nevím, co sledovat“ — náhodný tip z výsledkov
//  • „Podobné jako…“ — filmy podobné vybranému titulu
//  • posuvníky od–do, mriežka / podrobný zoznam, „Možná jste mysleli“
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
type Smart = { patch: Record<string, any>; chips: Array<{ kind: string; label: string }>; rest: string; understood: boolean };

const LIST_KEYS = ['types', 'genres', 'exGenres', 'countries', 'exCountries', 'services', 'actors', 'keywords'] as const;
const TEXT_KEYS = ['q', 'yearFrom', 'yearTo', 'lenFrom', 'lenTo', 'ratingFrom', 'ratingTo', 'minVotes', 'maxVotes', 'addedDays', 'director', 'writer', 'camera', 'music', 'genresMode', 'sort', 'similar'] as const;
const FLAG_KEYS = ['cinema', 'online', 'subs', 'dub', 'hideSeen', 'onlySeen', 'onlyWatchlist', 'hasReviews', 'hasGallery', 'hasVideos', 'hasTrivia', 'upcoming', 'noCam'] as const;

type ListKey = (typeof LIST_KEYS)[number];
type TextKey = (typeof TEXT_KEYS)[number];
type FlagKey = (typeof FLAG_KEYS)[number];
type State = Record<ListKey, string[]> & Record<TextKey, string> & Record<FlagKey, boolean>;

const EMPTY: State = {
  types: [], genres: [], exGenres: [], countries: [], exCountries: [], services: [], actors: [], keywords: [],
  q: '', yearFrom: '', yearTo: '', lenFrom: '', lenTo: '', ratingFrom: '', ratingTo: '', minVotes: '', maxVotes: '', addedDays: '',
  director: '', writer: '', camera: '', music: '', genresMode: 'any', sort: 'popular', similar: '',
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
    if (!v || (k === 'genresMode' && v === 'any') || (k === 'sort' && v === 'popular')) return;
    p.set(k, v);
  });
  FLAG_KEYS.forEach((k) => s[k] && p.set(k, '1'));
  return p;
}

const SORT_LABELS: Record<string, string> = {
  popular: 'Nejpopulárnější',
  rating: 'Nejlépe hodnocené',
  worst: 'Nejhůře hodnocené',
  newest: 'Nejnovější',
  oldest: 'Nejstarší',
  az: 'Název A–Z',
  za: 'Název Z–A',
  reviews: 'Nejvíce recenzí',
  added: 'Naposledy přidané',
  boxoffice: 'Nejvyšší tržby',
  longest: 'Nejdelší',
  shortest: 'Nejkratší',
  similar: 'Nejpodobnější'
};

const DECADES = [
  { label: '2020+', from: 2020, to: null },
  { label: '2010s', from: 2010, to: 2019 },
  { label: '2000s', from: 2000, to: 2009 },
  { label: '90. léta', from: 1990, to: 1999 },
  { label: '80. léta', from: 1980, to: 1989 },
  { label: '70. léta', from: 1970, to: 1979 },
  { label: 'Starší', from: null, to: 1969 }
];

const VOTES = [
  { label: 'Bez omezení', value: '' },
  { label: '10+', value: '10' },
  { label: '100+', value: '100' },
  { label: '1 000+', value: '1000' },
  { label: '10 000+', value: '10000' }
];

const PEOPLE: Array<{ key: 'director' | 'writer' | 'camera' | 'music'; kind: string; label: string }> = [
  { key: 'director', kind: 'director', label: 'Režie' },
  { key: 'writer', kind: 'writer', label: 'Scénář' },
  { key: 'camera', kind: 'camera', label: 'Kamera' },
  { key: 'music', kind: 'music', label: 'Hudba' }
];

const SAVED_KEY = 'kf_filter_saved';
const HISTORY_KEY = 'kf_filter_history';

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
    /* plné úložisko — nevadí */
  }
}

// ---------------------------------------------------------------------------
// Drobné komponenty
// ---------------------------------------------------------------------------

function Section({ title, children, defaultOpen = true, badge }: { title: string; children: React.ReactNode; defaultOpen?: boolean; badge?: number }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-line last:border-b-0">
      <button type="button" onClick={() => setOpen(!open)} className="w-full flex items-center justify-between py-3 text-left">
        <span className="text-[12.5px] font-bold uppercase tracking-wide text-ink flex items-center gap-2">
          {title}
          {badge ? <span className="text-[10px] bg-accent text-white rounded-full px-1.5 py-0.5 leading-none">{badge}</span> : null}
        </span>
        <span className={`text-muted text-xs transition-transform ${open ? 'rotate-180' : ''}`}>▾</span>
      </button>
      {open && <div className="pb-4">{children}</div>}
    </div>
  );
}

function Chip({ label, count, state, onClick, title }: { label: string; count?: number; state: 'off' | 'on' | 'ex'; onClick: () => void; title?: string }) {
  const cls =
    state === 'on'
      ? 'bg-accent border-accent text-white'
      : state === 'ex'
        ? 'bg-danger/10 border-danger text-danger line-through'
        : 'bg-surface border-line text-ink hover:border-accent';
  const disabled = state === 'off' && count === 0;
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-1.5 text-xs font-semibold rounded-full border px-3 py-1.5 transition-colors disabled:opacity-35 disabled:cursor-not-allowed ${cls}`}
    >
      {state === 'ex' && <span>⊘</span>}
      {label}
      {count !== undefined && <span className={`text-[10px] font-bold ${state === 'on' ? 'text-white/80' : 'text-muted'}`}>{count}</span>}
    </button>
  );
}

function Toggle({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" className="w-full flex items-center justify-between gap-3 py-1.5 text-left select-none" onClick={() => onChange(!checked)}>
      <span>
        <span className="text-sm text-ink block">{label}</span>
        {hint && <span className="text-[11px] text-muted block leading-tight">{hint}</span>}
      </span>
      <span role="switch" aria-checked={checked} className={`relative w-10 h-6 rounded-full transition-colors flex-none ${checked ? 'bg-accent' : 'bg-line'}`}>
        <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${checked ? 'left-[18px]' : 'left-0.5'}`} />
      </span>
    </button>
  );
}

// Posuvník od–do (dva bežce na jednej dráhe)
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
      <div className="flex items-center justify-between text-xs mb-2">
        <span className="font-bold text-ink">{format(a)}</span>
        <span className="font-bold text-ink">{format(b)}</span>
      </div>
      <div className="relative h-6 text-accent">
        <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 h-1.5 rounded-full bg-line" />
        <div className="absolute top-1/2 -translate-y-1/2 h-1.5 rounded-full bg-accent" style={{ left: `${pct(a)}%`, right: `${100 - pct(b)}%` }} />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={a}
          onChange={(e) => emit(Math.min(Number(e.target.value), b), b)}
          className="kf-range absolute inset-0 w-full appearance-none bg-transparent pointer-events-none"
          aria-label="Od"
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={b}
          onChange={(e) => emit(a, Math.max(Number(e.target.value), a))}
          className="kf-range absolute inset-0 w-full appearance-none bg-transparent pointer-events-none"
          aria-label="Do"
        />
      </div>
    </div>
  );
}

function Suggest({
  kind,
  placeholder,
  onPick,
  value,
  onChange
}: {
  kind: string;
  placeholder: string;
  onPick: (name: string, item?: any) => void;
  value?: string;
  onChange?: (v: string) => void;
}) {
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
        className="w-full bg-surface border border-line rounded-lg px-3 py-2 text-sm text-ink placeholder:text-muted outline-none focus:border-accent"
      />
      {open && list.length > 0 && (
        <div className="absolute z-30 left-0 right-0 mt-1 bg-card border border-line rounded-lg shadow-xl max-h-72 overflow-auto">
          {list.map((s, i) => (
            <button
              key={`${s.name}-${i}`}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onMouseEnter={() => setHi(i)}
              onClick={() => choose(s)}
              className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left ${i === hi ? 'bg-surface' : ''}`}
            >
              {kind === 'title' && (
                <span className="w-7 h-10 rounded bg-line overflow-hidden flex-none">{s.poster ? <img src={s.poster} alt="" className="w-full h-full object-cover" /> : null}</span>
              )}
              <span className="text-ink truncate flex-1">{s.name}</span>
              <span className="text-[11px] text-muted">{kind === 'title' ? s.count || '' : `${s.count}×`}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Percent({ m, className = '' }: { m: Item; className?: string }) {
  if (m.percent === null || m.percent === undefined) return null;
  return (
    <span
      className={`inline-block text-[11px] font-extrabold text-white rounded-md px-1.5 py-0.5 ${m.percentColor ? '' : 'bg-accent'} ${className}`}
      style={m.percentColor ? { backgroundColor: m.percentColor } : undefined}
    >
      {m.percent} %
    </span>
  );
}

function Card({ m }: { m: Item }) {
  const meta = [m.year, m.contentType !== 'Film' ? valueLabel(m.contentType) : null, m.genres[0] ? valueLabel(m.genres[0]) : null].filter(Boolean).join(' · ');
  return (
    <Link href={`/movie/${m.slug}`} className="group block">
      <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-surface border border-line">
        {m.poster ? (
          <img src={m.poster} alt={m.title} loading="lazy" className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-300" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted text-3xl">🎬</div>
        )}
        <Percent m={m} className="absolute top-2 left-2 shadow" />
        {m.watched && (
          <span className="absolute top-2 right-2 w-6 h-6 rounded-full bg-green-600 text-white text-xs font-bold flex items-center justify-center shadow" title="Viděno">
            ✓
          </span>
        )}
        <div className="absolute bottom-2 left-2 right-2 flex gap-1 flex-wrap">
          {m.nowShowing && <span className="text-[10px] font-bold bg-black/75 text-white rounded px-1.5 py-0.5">V KINĚ</span>}
          {m.online && <span className="text-[10px] font-bold bg-black/75 text-white rounded px-1.5 py-0.5">ONLINE</span>}
          {m.inWatchlist && <span className="text-[10px] font-bold bg-black/75 text-white rounded px-1.5 py-0.5">★ CHCI</span>}
        </div>
      </div>
      <div className="mt-2">
        <div className="text-sm font-bold text-ink leading-snug line-clamp-2 group-hover:text-accent transition-colors">{m.title}</div>
        {meta && <div className="text-[11px] text-muted mt-0.5 truncate">{meta}</div>}
      </div>
    </Link>
  );
}

function Row({ m, services }: { m: Item; services: Options['services'] }) {
  const svc = m.services.map((id) => services.find((s) => s.id === id)).filter(Boolean) as Options['services'];
  return (
    <Link href={`/movie/${m.slug}`} className="group flex gap-4 p-3 rounded-xl border border-line bg-surface/40 hover:border-accent transition-colors">
      <div className="relative w-20 sm:w-24 aspect-[2/3] rounded-lg overflow-hidden bg-surface flex-none">
        {m.poster ? <img src={m.poster} alt="" loading="lazy" className="w-full h-full object-cover" /> : null}
        {m.watched && <span className="absolute top-1 right-1 w-5 h-5 rounded-full bg-green-600 text-white text-[10px] font-bold flex items-center justify-center">✓</span>}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <div className="font-bold text-ink group-hover:text-accent transition-colors leading-snug">{m.title}</div>
            {m.originalTitle && m.originalTitle !== m.title && <div className="text-xs text-muted truncate">{m.originalTitle}</div>}
          </div>
          <div className="text-right flex-none">
            <Percent m={m} className="text-sm px-2" />
            {m.votes > 0 && <div className="text-[10px] text-muted mt-1">{m.votes.toLocaleString('cs-CZ')} hl.</div>}
          </div>
        </div>
        <div className="text-xs text-muted mt-1.5">
          {[m.year, valueLabel(m.contentType), m.runtime ? `${m.runtime} min` : null, m.countries.slice(0, 2).map(valueLabel).join(', ')].filter(Boolean).join(' · ')}
        </div>
        {m.genres.length > 0 && <div className="text-xs text-ink/80 mt-1">{m.genres.slice(0, 4).map(valueLabel).join(', ')}</div>}
        {(m.directors.length > 0 || m.cast.length > 0) && (
          <div className="text-xs text-muted mt-1 line-clamp-1">
            {m.directors.length > 0 && (
              <>
                Režie: <span className="text-ink/80">{m.directors.join(', ')}</span>
              </>
            )}
            {m.directors.length > 0 && m.cast.length > 0 && ' · '}
            {m.cast.length > 0 && (
              <>
                Hrají: <span className="text-ink/80">{m.cast.join(', ')}</span>
              </>
            )}
          </div>
        )}
        <div className="flex flex-wrap gap-1 mt-2">
          {m.nowShowing && <span className="text-[10px] font-bold bg-accent/15 text-accent rounded px-1.5 py-0.5">V KINĚ</span>}
          {svc.map((s) => (
            <span key={s.id} className="text-[10px] font-bold rounded px-1.5 py-0.5 text-white" style={{ backgroundColor: s.color || '#555' }}>
              {s.name}
            </span>
          ))}
          {m.hasSubtitles && <span className="text-[10px] font-semibold bg-line/70 text-ink rounded px-1.5 py-0.5">Titulky</span>}
          {m.hasDubbing && <span className="text-[10px] font-semibold bg-line/70 text-ink rounded px-1.5 py-0.5">Dabing</span>}
          {m.reviews > 0 && <span className="text-[10px] font-semibold bg-line/70 text-ink rounded px-1.5 py-0.5">{m.reviews} recenzí</span>}
        </div>
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
  const [showAllCountries, setShowAllCountries] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');
  const [smart, setSmart] = useState<Smart | null>(null);
  const [saved, setSaved] = useState<Array<{ name: string; qs: string }>>([]);
  const [history, setHistory] = useState<string[]>([]);
  const [myOpen, setMyOpen] = useState(false);
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
    setHistory(readLS(HISTORY_KEY, []));
    setView(readLS<'grid' | 'list'>('kf_filter_view', 'grid'));
  }, []);

  // Výsledky — pri každej zmene filtra
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
    }, 260);
    return () => clearTimeout(t);
  }, [qs]);

  // História: zapamätá si filter, pri ktorom sa používateľ chvíľu zdržal
  useEffect(() => {
    if (!qs || activeCount === 0) return;
    const t = setTimeout(() => {
      setHistory((prev) => {
        const next = [qs, ...prev.filter((x) => x !== qs)].slice(0, 8);
        writeLS(HISTORY_KEY, next);
        return next;
      });
    }, 4000);
    return () => clearTimeout(t);
  }, [qs, activeCount]);

  // Chytré hľadanie vetou — čo z napísaného textu vieme urobiť filter
  useEffect(() => {
    const q = s.q.trim();
    if (q.length < 4 || !q.includes(' ')) {
      setSmart(null);
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      fetch(`/api/movie-filter/parse?q=${encodeURIComponent(q)}`, { signal: ctrl.signal })
        .then((r) => r.json())
        .then((d: Smart) => setSmart(d?.understood ? d : null))
        .catch(() => {});
    }, 350);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [s.q]);

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

  // Nekonečné scrollovanie
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
  function reset() {
    setS({ ...EMPTY });
  }
  function applySmart() {
    if (!smart) return;
    const entries = Object.entries(smart.patch).map(([k, v]) => [k, Array.isArray(v) ? v.join(',') : v === true ? '1' : String(v)] as [string, string]);
    setS((prev) => ({ ...applyParams(prev, entries), q: smart.rest }));
    setSmart(null);
  }
  function applyPreset(params: Record<string, string>) {
    setS(applyParams({ ...EMPTY }, Object.entries(params)));
  }
  function applyQs(q: string) {
    setS(applyParams({ ...EMPTY }, Array.from(new URLSearchParams(q).entries())));
    setMyOpen(false);
  }
  function summary(st: State) {
    const parts: string[] = [];
    st.genres.forEach((g) => parts.push(valueLabel(g)));
    st.types.forEach((t) => parts.push(valueLabel(t)));
    st.countries.forEach((c) => parts.push(valueLabel(c)));
    if (st.yearFrom || st.yearTo) parts.push(`${st.yearFrom || '…'}–${st.yearTo || '…'}`);
    if (st.ratingFrom) parts.push(`${st.ratingFrom} %+`);
    st.actors.forEach((a) => parts.push(a));
    if (st.director) parts.push(st.director);
    if (st.q) parts.push(`„${st.q}“`);
    return parts.join(' · ') || 'Filtr';
  }
  function saveCurrent() {
    const name = window.prompt('Název filtru (např. „Pátek s přáteli“):', summary(s).slice(0, 40));
    if (!name) return;
    const next = [{ name: name.slice(0, 60), qs }, ...saved.filter((x) => x.name !== name)].slice(0, 20);
    setSaved(next);
    writeLS(SAVED_KEY, next);
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
    return Object.keys(options.genres).sort((a, b) => (options.genres[b] || 0) - (options.genres[a] || 0));
  }, [options]);

  const countryList = useMemo(() => {
    const base = options ? Object.keys(options.countries) : [];
    const q = countrySearch.trim().toLowerCase();
    const filtered = q ? base.filter((c) => valueLabel(c).toLowerCase().includes(q) || c.toLowerCase().includes(q)) : base;
    const selected = [...s.countries, ...s.exCountries];
    const rest = filtered.filter((c) => !selected.includes(c));
    return [...selected, ...(showAllCountries || q ? rest : rest.slice(0, 14))];
  }, [options, countrySearch, showAllCountries, s.countries, s.exCountries]);

  const activePreset = FILTER_PRESETS.find((p) => toParams(applyParams({ ...EMPTY }, Object.entries(p.params))).toString() === qs)?.key;

  // Čipy aktívnych filtrov
  const activeChips: Array<{ label: string; clear: () => void }> = [];
  if (s.similar) activeChips.push({ label: `≈ ${similarTo?.title || 'Podobné'}`, clear: () => setS((p) => ({ ...p, similar: '', sort: p.sort === 'similar' ? 'popular' : p.sort })) });
  if (s.q.trim()) activeChips.push({ label: `„${s.q.trim()}“`, clear: () => set('q', '') });
  s.types.forEach((v) => activeChips.push({ label: valueLabel(v), clear: () => toggleIn('types', v) }));
  s.genres.forEach((v) => activeChips.push({ label: valueLabel(v), clear: () => toggleIn('genres', v) }));
  s.exGenres.forEach((v) => activeChips.push({ label: `bez: ${valueLabel(v)}`, clear: () => toggleIn('exGenres', v) }));
  s.countries.forEach((v) => activeChips.push({ label: valueLabel(v), clear: () => toggleIn('countries', v) }));
  s.exCountries.forEach((v) => activeChips.push({ label: `bez: ${valueLabel(v)}`, clear: () => toggleIn('exCountries', v) }));
  if (s.yearFrom || s.yearTo) activeChips.push({ label: `Rok ${s.yearFrom || '…'}–${s.yearTo || '…'}`, clear: () => setS((p) => ({ ...p, yearFrom: '', yearTo: '' })) });
  if (s.lenFrom || s.lenTo) activeChips.push({ label: `Délka ${s.lenFrom || '0'}–${s.lenTo || '∞'} min`, clear: () => setS((p) => ({ ...p, lenFrom: '', lenTo: '' })) });
  if (s.ratingFrom || s.ratingTo) activeChips.push({ label: `Hodnocení ${s.ratingFrom || 0}–${s.ratingTo || 100} %`, clear: () => setS((p) => ({ ...p, ratingFrom: '', ratingTo: '' })) });
  if (s.minVotes) activeChips.push({ label: `${Number(s.minVotes).toLocaleString('cs-CZ')}+ hlasů`, clear: () => set('minVotes', '') });
  if (s.maxVotes) activeChips.push({ label: 'Méně známé', clear: () => set('maxVotes', '') });
  if (s.addedDays) activeChips.push({ label: `Přidané za ${s.addedDays} dní`, clear: () => set('addedDays', '') });
  s.services.forEach((id) => activeChips.push({ label: options?.services.find((x) => x.id === id)?.name || 'Služba', clear: () => toggleIn('services', id) }));
  const flagLabels: Record<FlagKey, string> = {
    cinema: 'V kině',
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
    noCam: 'Bez CAM verzí'
  };
  FLAG_KEYS.forEach((k) => s[k] && activeChips.push({ label: flagLabels[k], clear: () => set(k, false) }));
  PEOPLE.forEach((p) => s[p.key] && activeChips.push({ label: `${p.label}: ${s[p.key]}`, clear: () => set(p.key, '') }));
  s.actors.forEach((a) => activeChips.push({ label: `Hraje: ${a}`, clear: () => toggleIn('actors', a) }));
  s.keywords.forEach((k) => activeChips.push({ label: `#${k}`, clear: () => toggleIn('keywords', k) }));

  const f = facets;
  const yearMin = options?.yearMin ?? 1920;
  const yearMax = options?.yearMax ?? new Date().getFullYear() + 2;
  const lenMax = Math.min(300, Math.max(180, options?.runtimeMax ?? 240));

  const panel = (
    <div className="text-sm">
      <Section title="Podobné jako…" badge={s.similar ? 1 : 0} defaultOpen={!!s.similar}>
        <p className="text-[11px] text-muted mb-2">Vyber film, který se ti líbil — najdeme podobné podle žánru, tvůrců, herců i témat.</p>
        <Suggest kind="title" placeholder="Název filmu nebo seriálu…" onPick={(_, item) => item?.id && setS((p) => ({ ...p, similar: item.id, sort: 'popular' }))} />
        {s.similar && similarTo && (
          <div className="mt-2">
            <Chip label={`≈ ${similarTo.title} ✕`} state="on" onClick={() => setS((p) => ({ ...p, similar: '' }))} />
          </div>
        )}
      </Section>

      <Section title="Typ" badge={s.types.length}>
        <div className="flex flex-wrap gap-2">
          {options &&
            Object.keys(options.types).map((t) => (
              <Chip key={t} label={valueLabel(t)} count={f?.types[t] ?? 0} state={s.types.includes(t) ? 'on' : 'off'} onClick={() => toggleIn('types', t)} />
            ))}
        </div>
      </Section>

      <Section title="Žánry" badge={s.genres.length + s.exGenres.length}>
        <div className="flex items-center gap-1 mb-3 bg-surface rounded-lg p-1 w-fit">
          {(['any', 'all'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => set('genresMode', mode)}
              className={`text-xs font-semibold rounded-md px-3 py-1 ${s.genresMode === mode ? 'bg-card text-ink shadow' : 'text-muted'}`}
            >
              {mode === 'any' ? 'Kterýkoli' : 'Všechny zvolené'}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {genreList.map((g) => (
            <Chip
              key={g}
              label={valueLabel(g)}
              count={s.genres.includes(g) || s.exGenres.includes(g) ? undefined : f?.genres[g] ?? 0}
              state={s.genres.includes(g) ? 'on' : s.exGenres.includes(g) ? 'ex' : 'off'}
              onClick={() => cycle('genres', 'exGenres', g)}
              title="1. klik = zahrnout, 2. klik = vyloučit"
            />
          ))}
        </div>
        <p className="text-[11px] text-muted mt-2">Tip: druhým kliknutím žánr vyloučíš.</p>
      </Section>

      <Section title="Rok" badge={s.yearFrom || s.yearTo ? 1 : 0}>
        <DualRange min={yearMin} max={yearMax} from={s.yearFrom} to={s.yearTo} onChange={(a, b) => setS((p) => ({ ...p, yearFrom: a, yearTo: b }))} />
        <div className="flex flex-wrap gap-2 mt-3">
          {DECADES.map((d) => {
            const on = s.yearFrom === (d.from ? String(d.from) : '') && s.yearTo === (d.to ? String(d.to) : '');
            return (
              <Chip
                key={d.label}
                label={d.label}
                state={on ? 'on' : 'off'}
                onClick={() => setS((p) => (on ? { ...p, yearFrom: '', yearTo: '' } : { ...p, yearFrom: d.from ? String(d.from) : '', yearTo: d.to ? String(d.to) : '' }))}
              />
            );
          })}
        </div>
      </Section>

      <Section title="Hodnocení" badge={(s.ratingFrom || s.ratingTo ? 1 : 0) + (s.minVotes ? 1 : 0) + (s.maxVotes ? 1 : 0)}>
        <DualRange min={0} max={100} step={5} from={s.ratingFrom} to={s.ratingTo} format={(v) => `${v} %`} onChange={(a, b) => setS((p) => ({ ...p, ratingFrom: a, ratingTo: b }))} />
        <div className="text-muted text-xs mt-4 mb-2">Minimální počet hlasů (ať výsledky nekazí tituly s pár hlasy)</div>
        <div className="flex flex-wrap gap-2">
          {VOTES.map((v) => (
            <Chip key={v.label} label={v.label} state={s.minVotes === v.value ? 'on' : 'off'} onClick={() => set('minVotes', v.value)} />
          ))}
        </div>
        <div className="mt-3">
          <Toggle label="Jen méně známé" hint="Skryté perly — do 20 000 hlasů" checked={!!s.maxVotes} onChange={(v) => set('maxVotes', v ? '20000' : '')} />
        </div>
      </Section>

      <Section title="Délka" badge={s.lenFrom || s.lenTo ? 1 : 0} defaultOpen={false}>
        <DualRange min={0} max={lenMax} step={5} from={s.lenFrom} to={s.lenTo} format={(v) => (v >= lenMax ? `${lenMax}+ min` : `${v} min`)} onChange={(a, b) => setS((p) => ({ ...p, lenFrom: a, lenTo: b }))} />
      </Section>

      <Section title="Kde sledovat" badge={s.services.length + [s.cinema, s.online, s.subs, s.dub, s.noCam].filter(Boolean).length}>
        {options && options.services.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {options.services.map((sv) => (
              <Chip key={sv.id} label={sv.name} count={f?.services[sv.id] ?? 0} state={s.services.includes(sv.id) ? 'on' : 'off'} onClick={() => toggleIn('services', sv.id)} />
            ))}
          </div>
        )}
        <Toggle label="Právě v kinech" checked={s.cinema} onChange={(v) => set('cinema', v)} />
        <Toggle label="Online ke zhlédnutí" checked={s.online} onChange={(v) => set('online', v)} />
        <Toggle label="S titulky" checked={s.subs} onChange={(v) => set('subs', v)} />
        <Toggle label="S dabingem" checked={s.dub} onChange={(v) => set('dub', v)} />
        <Toggle label="Bez CAM verzí" hint="Skrýt nekvalitní záznamy z kina" checked={s.noCam} onChange={(v) => set('noCam', v)} />
      </Section>

      <Section title="Země" badge={s.countries.length + s.exCountries.length} defaultOpen={false}>
        <input
          value={countrySearch}
          onChange={(e) => setCountrySearch(e.target.value)}
          placeholder="Hledat zemi…"
          className="w-full bg-surface border border-line rounded-lg px-3 py-2 text-sm text-ink placeholder:text-muted outline-none focus:border-accent mb-3"
        />
        <div className="flex flex-wrap gap-2">
          {countryList.map((c) => (
            <Chip
              key={c}
              label={valueLabel(c)}
              count={s.countries.includes(c) || s.exCountries.includes(c) ? undefined : f?.countries[c] ?? 0}
              state={s.countries.includes(c) ? 'on' : s.exCountries.includes(c) ? 'ex' : 'off'}
              onClick={() => cycle('countries', 'exCountries', c)}
            />
          ))}
        </div>
        {!countrySearch && options && Object.keys(options.countries).length > 14 && (
          <button type="button" onClick={() => setShowAllCountries(!showAllCountries)} className="text-xs font-semibold text-accent mt-3 hover:underline">
            {showAllCountries ? 'Zobrazit méně' : `Zobrazit všechny (${Object.keys(options.countries).length})`}
          </button>
        )}
      </Section>

      <Section title="Tvůrci a herci" badge={PEOPLE.filter((p) => s[p.key]).length + s.actors.length} defaultOpen={false}>
        <div className="space-y-3">
          <div>
            <div className="text-xs text-muted mb-1">Hrají (můžeš přidat víc herců — musí hrát všichni)</div>
            <Suggest kind="actor" placeholder="Jméno herce…" onPick={(n) => !s.actors.includes(n) && set('actors', [...s.actors, n])} />
            {s.actors.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {s.actors.map((a) => (
                  <Chip key={a} label={`${a} ✕`} state="on" onClick={() => toggleIn('actors', a)} />
                ))}
              </div>
            )}
          </div>
          {PEOPLE.map((p) => (
            <div key={p.key}>
              <div className="text-xs text-muted mb-1">{p.label}</div>
              <Suggest kind={p.kind} placeholder="Jméno…" value={s[p.key]} onChange={(v) => set(p.key, v)} onPick={(n) => set(p.key, n)} />
            </div>
          ))}
        </div>
      </Section>

      <Section title="Klíčová slova" badge={s.keywords.length} defaultOpen={s.keywords.length > 0}>
        <Suggest kind="keyword" placeholder="např. superhrdina, vesmír, pomsta…" onPick={(n) => !s.keywords.includes(n) && set('keywords', [...s.keywords, n])} />
        {s.keywords.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {s.keywords.map((k) => (
              <Chip key={k} label={`#${k} ✕`} state="on" onClick={() => toggleIn('keywords', k)} />
            ))}
          </div>
        )}
      </Section>

      {loggedIn && (
        <Section title="Moje" badge={[s.hideSeen, s.onlySeen, s.onlyWatchlist].filter(Boolean).length}>
          <Toggle label="Skrýt, co jsem už viděl" checked={s.hideSeen} onChange={(v) => setS((p) => ({ ...p, hideSeen: v, onlySeen: v ? false : p.onlySeen }))} />
          <Toggle label="Jen to, co jsem viděl" checked={s.onlySeen} onChange={(v) => setS((p) => ({ ...p, onlySeen: v, hideSeen: v ? false : p.hideSeen }))} />
          <Toggle label="Jen z mého „Chci vidět“" checked={s.onlyWatchlist} onChange={(v) => set('onlyWatchlist', v)} />
        </Section>
      )}

      <Section title="Další" badge={[s.upcoming, s.hasReviews, s.hasGallery, s.hasVideos, s.hasTrivia].filter(Boolean).length + (s.addedDays ? 1 : 0)} defaultOpen={false}>
        <Toggle label="Chystá se" hint="Premiéra teprve bude" checked={s.upcoming} onChange={(v) => set('upcoming', v)} />
        <Toggle label="Nově přidané na web" hint="Za posledních 30 dní" checked={!!s.addedDays} onChange={(v) => set('addedDays', v ? '30' : '')} />
        <Toggle label="Má recenze" checked={s.hasReviews} onChange={(v) => set('hasReviews', v)} />
        <Toggle label="Má galerii" checked={s.hasGallery} onChange={(v) => set('hasGallery', v)} />
        <Toggle label="Má videa" checked={s.hasVideos} onChange={(v) => set('hasVideos', v)} />
        <Toggle label="Má zajímavosti" checked={s.hasTrivia} onChange={(v) => set('hasTrivia', v)} />
      </Section>
    </div>
  );

  return (
    <div className="border border-line border-t-0 rounded-b bg-card">
      <style>{`
        .kf-range::-webkit-slider-thumb{pointer-events:auto;-webkit-appearance:none;appearance:none;width:18px;height:18px;border-radius:9999px;background:#fff;border:3px solid currentColor;box-shadow:0 1px 4px rgba(0,0,0,.35);cursor:pointer}
        .kf-range::-moz-range-thumb{pointer-events:auto;width:14px;height:14px;border-radius:9999px;background:#fff;border:3px solid currentColor;box-shadow:0 1px 4px rgba(0,0,0,.35);cursor:pointer}
        .kf-range::-webkit-slider-runnable-track{background:transparent}
        .kf-range::-moz-range-track{background:transparent}
      `}</style>

      {/* Chytré hľadanie + akcie */}
      <div className="p-4 border-b border-line">
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
          <div className="flex-1 relative">
            <input
              value={s.q}
              onChange={(e) => set('q', e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && smart) {
                  e.preventDefault();
                  applySmart();
                }
              }}
              placeholder="Napiš název nebo celou větu — např. „korejské thrillery na Netflixu nad 75 %“"
              className="w-full bg-surface border border-line rounded-xl pl-10 pr-3 py-3 text-sm text-ink placeholder:text-muted outline-none focus:border-accent"
            />
            <svg className="w-4 h-4 text-muted absolute left-3.5 top-1/2 -translate-y-1/2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3.6-3.6" />
            </svg>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button type="button" onClick={randomTip} className="flex items-center gap-2 bg-surface border border-line hover:border-accent rounded-xl px-3.5 py-2.5 text-sm font-semibold text-ink">
              🎲 <span className="hidden sm:inline">Nevím, co sledovat</span>
            </button>
            <div className="relative">
              <button type="button" onClick={() => setMyOpen(!myOpen)} className="flex items-center gap-2 bg-surface border border-line hover:border-accent rounded-xl px-3.5 py-2.5 text-sm font-semibold text-ink">
                ⭐ <span className="hidden sm:inline">Moje filtry</span>
              </button>
              {myOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setMyOpen(false)} />
                  <div className="absolute right-0 z-40 mt-2 w-80 max-w-[calc(100vw-2rem)] bg-card border border-line rounded-xl shadow-2xl p-3">
                    <button
                      type="button"
                      disabled={activeCount === 0}
                      onClick={saveCurrent}
                      className="w-full bg-accent text-white rounded-lg py-2 text-sm font-bold disabled:opacity-40 mb-3"
                    >
                      Uložit aktuální filtr
                    </button>
                    {saved.length > 0 && (
                      <>
                        <div className="text-[11px] font-bold uppercase text-muted mb-1">Uložené</div>
                        {saved.map((x) => (
                          <div key={x.name} className="flex items-center gap-2 rounded-lg hover:bg-surface">
                            <button type="button" onClick={() => applyQs(x.qs)} className="flex-1 text-left text-sm text-ink px-2 py-1.5 truncate">
                              {x.name}
                            </button>
                            <button type="button" onClick={() => removeSaved(x.name)} className="text-muted hover:text-danger px-2" aria-label="Smazat">
                              ✕
                            </button>
                          </div>
                        ))}
                      </>
                    )}
                    {history.length > 0 && (
                      <>
                        <div className="text-[11px] font-bold uppercase text-muted mt-3 mb-1">Naposledy hledané</div>
                        {history.map((h) => (
                          <button key={h} type="button" onClick={() => applyQs(h)} className="w-full text-left text-sm text-ink px-2 py-1.5 rounded-lg hover:bg-surface truncate">
                            {summary(applyParams({ ...EMPTY }, Array.from(new URLSearchParams(h).entries())))}
                          </button>
                        ))}
                      </>
                    )}
                    {saved.length === 0 && history.length === 0 && <p className="text-xs text-muted">Zatím tu nic není. Nastav filtr a ulož si ho.</p>}
                  </div>
                </>
              )}
            </div>
            <button type="button" onClick={() => setDrawer(true)} className="lg:hidden flex items-center gap-2 bg-surface border border-line rounded-xl px-3.5 py-2.5 text-sm font-semibold text-ink">
              Filtry{activeCount ? <span className="bg-accent text-white text-[11px] rounded-full px-1.5">{activeCount}</span> : null}
            </button>
          </div>
        </div>

        {smart && (
          <div className="mt-3 flex items-center gap-2 flex-wrap bg-accent/10 border border-accent/30 rounded-xl px-3 py-2">
            <span className="text-sm font-semibold text-ink">✨ Rozumím:</span>
            {smart.chips.map((c, i) => (
              <span key={i} className="text-xs font-semibold bg-card border border-line rounded-full px-2.5 py-1 text-ink">
                {c.label}
              </span>
            ))}
            {smart.rest && <span className="text-xs text-muted">+ název „{smart.rest}“</span>}
            <button type="button" onClick={applySmart} className="ml-auto bg-accent text-white rounded-lg px-3 py-1.5 text-xs font-bold">
              Použít jako filtr ↵
            </button>
          </div>
        )}

        {/* Rýchle výbery */}
        <div className="mt-3 -mx-1 flex gap-2 overflow-x-auto pb-1 px-1">
          {FILTER_PRESETS.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => (activePreset === p.key ? reset() : applyPreset(p.params))}
              className={`flex-none flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-bold transition-colors ${
                activePreset === p.key ? 'bg-accent border-accent text-white' : 'bg-surface border-line text-ink hover:border-accent'
              }`}
            >
              <span>{p.emoji}</span>
              {p.label.cs}
            </button>
          ))}
        </div>
      </div>

      <div className="lg:grid lg:grid-cols-[300px_1fr]">
        <aside className="hidden lg:block border-r border-line px-4 py-2 max-h-[calc(100vh-110px)] overflow-y-auto sticky top-16 self-start">{panel}</aside>

        <section className="p-4 min-w-0">
          <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
            <div className="text-sm text-muted">
              {total === null ? (
                'Načítám…'
              ) : (
                <>
                  {similarTo ? (
                    <>
                      Podobné jako <strong className="text-ink">{similarTo.title}</strong>
                      {similarTo.year ? ` (${similarTo.year})` : ''} ·{' '}
                    </>
                  ) : null}
                  Nalezeno <strong className="text-ink">{total.toLocaleString('cs-CZ')}</strong>
                  {options && !similarTo ? ` z ${options.total.toLocaleString('cs-CZ')}` : ''} titulů
                </>
              )}
              {loading && total !== null && <span className="ml-2 inline-block w-3 h-3 rounded-full border-2 border-accent border-t-transparent animate-spin align-middle" />}
            </div>
            <div className="flex items-center gap-2">
              <select
                value={s.sort}
                onChange={(e) => set('sort', e.target.value)}
                className="bg-surface border border-line rounded-lg px-2.5 py-1.5 text-xs font-semibold text-ink outline-none focus:border-accent"
              >
                {Object.entries(SORT_LABELS)
                  .filter(([k]) => k !== 'similar' || s.similar)
                  .map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
              </select>
              <div className="flex bg-surface border border-line rounded-lg p-0.5">
                {(['grid', 'list'] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => changeView(v)}
                    className={`px-2 py-1 rounded-md text-xs ${view === v ? 'bg-card text-ink shadow' : 'text-muted'}`}
                    aria-label={v === 'grid' ? 'Mřížka' : 'Seznam'}
                    title={v === 'grid' ? 'Mřížka' : 'Podrobný seznam'}
                  >
                    {v === 'grid' ? '▦' : '☰'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {activeChips.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-4">
              {activeChips.map((c, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={c.clear}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold bg-accent/10 text-accent border border-accent/30 rounded-full px-3 py-1 hover:bg-accent/20"
                >
                  {c.label} <span aria-hidden>✕</span>
                </button>
              ))}
              <button type="button" onClick={reset} className="text-xs font-semibold text-muted hover:text-ink px-2">
                Zrušit vše
              </button>
            </div>
          )}

          {!loading && total === 0 ? (
            <div className="border border-line rounded-xl p-8 text-center bg-surface">
              <div className="font-display text-lg font-bold text-ink mb-1">Nic jsme nenašli</div>
              {didYouMean.length > 0 ? (
                <div className="mt-3">
                  <p className="text-sm text-muted mb-2">Možná jste mysleli:</p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {didYouMean.map((d) => (
                      <button
                        key={d.slug}
                        type="button"
                        onClick={() => set('q', d.title)}
                        className="text-sm font-semibold bg-card border border-line hover:border-accent rounded-full px-3 py-1.5 text-ink"
                      >
                        {d.title}
                        {d.year ? <span className="text-muted font-normal"> ({d.year})</span> : null}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted">Zkus některý filtr uvolnit — třeba zrušit vyloučený žánr nebo snížit minimální hodnocení.</p>
              )}
            </div>
          ) : (
            <>
              {view === 'grid' ? (
                <div className={`grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-x-4 gap-y-7 transition-opacity ${loading ? 'opacity-60' : ''}`}>
                  {items.map((m) => (
                    <Card key={m.id} m={m} />
                  ))}
                </div>
              ) : (
                <div className={`space-y-3 transition-opacity ${loading ? 'opacity-60' : ''}`}>
                  {items.map((m) => (
                    <Row key={m.id} m={m} services={options?.services || []} />
                  ))}
                </div>
              )}
              <div ref={sentinel} className="h-1" />
              {loadingMore && (
                <div className="flex justify-center py-6">
                  <span className="w-6 h-6 rounded-full border-2 border-accent border-t-transparent animate-spin" />
                </div>
              )}
              {limited && page >= pages && (
                <div className="mt-6 border border-line rounded-xl p-5 bg-surface flex items-start gap-4">
                  <img src="/golden-ticket-badge.svg" alt="" width={36} height={36} className="flex-none" />
                  <div>
                    <p className="text-sm font-semibold text-ink mb-1">Další výsledky jsou dostupné jen pro Golden Ticket členy.</p>
                    <Link href="/nastavenia/clenstvo" className="text-accent text-sm font-semibold hover:underline">
                      Zjistit více o členství →
                    </Link>
                  </div>
                </div>
              )}
            </>
          )}
        </section>
      </div>

      {/* Mobil — vysúvací panel */}
      {drawer && (
        <div className="lg:hidden fixed inset-0 z-[90] flex">
          <div className="absolute inset-0 bg-black/60" onClick={() => setDrawer(false)} />
          <div className="relative ml-auto w-full max-w-sm h-full bg-card flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-line">
              <span className="font-bold text-ink">Filtry</span>
              <div className="flex items-center gap-3">
                {activeChips.length > 0 && (
                  <button type="button" onClick={reset} className="text-xs font-semibold text-accent">
                    Zrušit vše
                  </button>
                )}
                <button type="button" onClick={() => setDrawer(false)} className="w-8 h-8 rounded-full bg-surface text-ink" aria-label="Zavřít">
                  ✕
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-4">{panel}</div>
            <div className="p-4 border-t border-line">
              <button type="button" onClick={() => setDrawer(false)} className="w-full bg-accent text-white rounded-xl py-3 text-sm font-bold">
                {total === null ? 'Zobrazit výsledky' : `Zobrazit ${total.toLocaleString('cs-CZ')} výsledků`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Náhodný tip */}
      {tip !== null && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" onClick={() => setTip(null)} />
          <div className="relative bg-card border border-line rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            {tip === 'loading' ? (
              <div className="p-10 text-center text-muted">🎲 Vybírám…</div>
            ) : (
              <div className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-[11px] font-bold uppercase tracking-wide text-accent">🎲 Tip pro tebe</div>
                  <button type="button" onClick={() => setTip(null)} className="text-muted hover:text-ink" aria-label="Zavřít">
                    ✕
                  </button>
                </div>
                <div className="flex gap-4">
                  <div className="w-28 aspect-[2/3] rounded-xl overflow-hidden bg-surface flex-none">{tip.poster ? <img src={tip.poster} alt="" className="w-full h-full object-cover" /> : null}</div>
                  <div className="min-w-0">
                    <div className="font-display text-lg font-extrabold text-ink leading-tight">{tip.title}</div>
                    <div className="text-xs text-muted mt-1">
                      {[tip.year, tip.runtime ? `${tip.runtime} min` : null, tip.genres.slice(0, 2).map(valueLabel).join(', ')].filter(Boolean).join(' · ')}
                    </div>
                    <div className="mt-2">
                      <Percent m={tip} className="text-sm px-2" />
                    </div>
                    {tip.directors.length > 0 && <div className="text-xs text-muted mt-2">Režie: {tip.directors.join(', ')}</div>}
                    {tip.cast.length > 0 && <div className="text-xs text-muted mt-1 line-clamp-2">Hrají: {tip.cast.join(', ')}</div>}
                  </div>
                </div>
                <div className="flex gap-2 mt-5">
                  <button type="button" onClick={randomTip} className="flex-1 bg-surface border border-line hover:border-accent rounded-xl py-2.5 text-sm font-bold text-ink">
                    🎲 Jiný tip
                  </button>
                  <Link href={`/movie/${tip.slug}`} className="flex-1 bg-accent text-white rounded-xl py-2.5 text-sm font-bold text-center">
                    Otevřít
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
