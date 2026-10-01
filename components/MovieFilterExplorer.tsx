'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { valueLabel } from '@/lib/valueLabels';
import { useFilterFormState } from './FilterFormState';

// ---------------------------------------------------------------------------
// Nový filter filmov a seriálov (web). Výsledky sa menia hneď pri každej
// zmene, filter sa ukladá do adresy (dá sa poslať odkazom), počty pri
// voľbách ukazujú, koľko titulov danú voľbu má.
// ---------------------------------------------------------------------------

type Options = {
  types: Record<string, number>;
  genres: Record<string, number>;
  countries: Record<string, number>;
  services: Array<{ id: string; name: string; icon: string | null; color: string | null; count: number }>;
  yearMin: number;
  yearMax: number;
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
  runtime: number | null;
  percent: number | null;
  percentColor: string | null;
  votes: number;
  nowShowing: boolean;
  online: boolean;
  watched: boolean;
  inWatchlist: boolean;
};

type Facets = { types: Record<string, number>; genres: Record<string, number>; countries: Record<string, number>; services: Record<string, number> };

const LIST_KEYS = ['types', 'genres', 'exGenres', 'countries', 'exCountries', 'services', 'actors', 'keywords'] as const;
const TEXT_KEYS = ['q', 'yearFrom', 'yearTo', 'lenFrom', 'lenTo', 'ratingFrom', 'ratingTo', 'minVotes', 'director', 'writer', 'camera', 'music', 'genresMode', 'sort'] as const;
const FLAG_KEYS = ['cinema', 'online', 'subs', 'dub', 'hideSeen', 'onlySeen', 'onlyWatchlist', 'hasReviews', 'hasGallery', 'hasVideos', 'hasTrivia'] as const;

type ListKey = (typeof LIST_KEYS)[number];
type TextKey = (typeof TEXT_KEYS)[number];
type FlagKey = (typeof FLAG_KEYS)[number];
type State = Record<ListKey, string[]> & Record<TextKey, string> & Record<FlagKey, boolean>;

const EMPTY: State = {
  types: [], genres: [], exGenres: [], countries: [], exCountries: [], services: [], actors: [], keywords: [],
  q: '', yearFrom: '', yearTo: '', lenFrom: '', lenTo: '', ratingFrom: '', ratingTo: '', minVotes: '',
  director: '', writer: '', camera: '', music: '', genresMode: 'any', sort: 'popular',
  cinema: false, online: false, subs: false, dub: false, hideSeen: false, onlySeen: false, onlyWatchlist: false,
  hasReviews: false, hasGallery: false, hasVideos: false, hasTrivia: false
};

const OLD_ALIASES: Record<string, string> = { genre: 'genres', country: 'countries', tag: 'keywords', tags: 'keywords', actor: 'actors', nowShowing: 'cinema', minLength: 'lenFrom', maxLength: 'lenTo', screenplay: 'writer', cinematography: 'camera', minRating: 'ratingFrom' };
const OLD_SORTS: Record<string, string> = { najnovsie: 'newest', najstarsie: 'oldest', 'najnovsie-pridane': 'added', najlepsie: 'rating', najhorsie: 'worst' };

function fromParams(sp: URLSearchParams | null): State {
  const s: State = JSON.parse(JSON.stringify(EMPTY));
  if (!sp) return s;
  sp.forEach((value, rawKey) => {
    const key = (OLD_ALIASES[rawKey] || rawKey) as string;
    if ((LIST_KEYS as readonly string[]).includes(key)) {
      (s as any)[key] = Array.from(new Set([...(s as any)[key], ...value.split(',').map((x) => x.trim()).filter(Boolean)]));
    } else if ((FLAG_KEYS as readonly string[]).includes(key)) {
      (s as any)[key] = value === '1' || value === 'true';
    } else if ((TEXT_KEYS as readonly string[]).includes(key)) {
      (s as any)[key] = key === 'sort' ? OLD_SORTS[value] || value : value;
    }
  });
  return s;
}

function toParams(s: State) {
  const p = new URLSearchParams();
  LIST_KEYS.forEach((k) => s[k].length && p.set(k, s[k].join(',')));
  TEXT_KEYS.forEach((k) => {
    const v = String(s[k] || '').trim();
    if (!v) return;
    if (k === 'genresMode' && v === 'any') return;
    if (k === 'sort' && v === 'popular') return;
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
  shortest: 'Nejkratší'
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

const LENGTHS = [
  { label: 'Do 90 min', from: null, to: 90 },
  { label: '90–120 min', from: 90, to: 120 },
  { label: '2–2,5 h', from: 120, to: 150 },
  { label: 'Nad 2,5 h', from: 150, to: null }
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

function Section({ title, children, defaultOpen = true, badge }: { title: string; children: React.ReactNode; defaultOpen?: boolean; badge?: number }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-line last:border-b-0">
      <button type="button" onClick={() => setOpen(!open)} className="w-full flex items-center justify-between py-3 text-left">
        <span className="text-[13px] font-bold uppercase tracking-wide text-ink flex items-center gap-2">
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
      {state === 'ex' && <span className="no-underline">⊘</span>}
      {label}
      {count !== undefined && <span className={`text-[10px] font-bold ${state === 'on' ? 'text-white/80' : 'text-muted'}`}>{count}</span>}
    </button>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-3 py-1.5 cursor-pointer select-none">
      <span className="text-sm text-ink">{label}</span>
      <span
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative w-10 h-6 rounded-full transition-colors flex-none ${checked ? 'bg-accent' : 'bg-line'}`}
      >
        <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${checked ? 'left-[18px]' : 'left-0.5'}`} />
      </span>
    </label>
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
  onPick: (name: string) => void;
  value?: string;
  onChange?: (v: string) => void;
}) {
  const [text, setText] = useState(value || '');
  const [list, setList] = useState<Array<{ name: string; count: number }>>([]);
  const [open, setOpen] = useState(false);
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
        .then((d) => setList(Array.isArray(d) ? d : []))
        .catch(() => {});
    }, 180);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [text, kind, open]);

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
          if (e.key === 'Enter' && text.trim()) {
            e.preventDefault();
            onPick(list[0]?.name || text.trim());
            if (!onChange) setText('');
            setOpen(false);
          }
        }}
        placeholder={placeholder}
        className="w-full bg-surface border border-line rounded-lg px-3 py-2 text-sm text-ink placeholder:text-muted outline-none focus:border-accent"
      />
      {open && list.length > 0 && (
        <div className="absolute z-30 left-0 right-0 mt-1 bg-card border border-line rounded-lg shadow-xl max-h-64 overflow-auto">
          {list.map((s) => (
            <button
              key={s.name}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onPick(s.name);
                setText(onChange ? s.name : '');
                setOpen(false);
              }}
              className="w-full flex items-center justify-between px-3 py-2 text-sm text-left hover:bg-surface"
            >
              <span className="text-ink truncate">{s.name}</span>
              <span className="text-[11px] text-muted ml-2">{s.count}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Card({ m }: { m: Item }) {
  const meta = [m.year, m.contentType !== 'Film' ? valueLabel(m.contentType) : null, m.genres[0] ? valueLabel(m.genres[0]) : null]
    .filter(Boolean)
    .join(' · ');
  return (
    <Link href={`/movie/${m.slug}`} className="group block">
      <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-surface border border-line">
        {m.poster ? (
          <img src={m.poster} alt={m.title} loading="lazy" className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted text-3xl">🎬</div>
        )}
        {m.percent !== null && (
          <span
            className={`absolute top-2 left-2 text-[11px] font-extrabold text-white rounded-md px-1.5 py-0.5 shadow ${m.percentColor ? '' : 'bg-accent'}`}
            style={m.percentColor ? { backgroundColor: m.percentColor } : undefined}
          >
            {m.percent} %
          </span>
        )}
        {m.watched && (
          <span className="absolute top-2 right-2 w-6 h-6 rounded-full bg-green-600 text-white text-xs font-bold flex items-center justify-center shadow" title="Viděno">
            ✓
          </span>
        )}
        <div className="absolute bottom-2 left-2 flex gap-1">
          {m.nowShowing && <span className="text-[10px] font-bold bg-black/75 text-white rounded px-1.5 py-0.5">V KINĚ</span>}
          {m.online && <span className="text-[10px] font-bold bg-black/75 text-white rounded px-1.5 py-0.5">ONLINE</span>}
        </div>
      </div>
      <div className="mt-2">
        <div className="text-sm font-bold text-ink leading-snug line-clamp-2 group-hover:text-accent transition-colors">{m.title}</div>
        {meta && <div className="text-[11px] text-muted mt-0.5 truncate">{meta}</div>}
      </div>
    </Link>
  );
}

export default function MovieFilterExplorer({ loggedIn }: { loggedIn: boolean }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setHasInput } = useFilterFormState();

  const [s, setS] = useState<State>(() => fromParams(searchParams ? new URLSearchParams(searchParams.toString()) : null));
  const [options, setOptions] = useState<Options | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [facets, setFacets] = useState<Facets | null>(null);
  const [total, setTotal] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [limited, setLimited] = useState(false);
  const [activeCount, setActiveCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [showAllCountries, setShowAllCountries] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');
  const reqId = useRef(0);

  const qs = useMemo(() => toParams(s).toString(), [s]);

  useEffect(() => {
    fetch('/api/movie-filter/options')
      .then((r) => r.json())
      .then(setOptions)
      .catch(() => {});
  }, []);

  // Výsledky — pri každej zmene (s krátkym oneskorením pri písaní)
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
        })
        .catch(() => {})
        .finally(() => id === reqId.current && setLoading(false));
      router.replace(qs ? `/recenzie/filter?${qs}` : '/recenzie/filter', { scroll: false });
    }, 280);
    return () => clearTimeout(t);
  }, [qs]);

  useEffect(() => {
    setHasInput(activeCount > 0);
    return () => setHasInput(false);
  }, [activeCount, setHasInput]);

  async function loadMore() {
    if (loadingMore || page >= pages) return;
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

  const set = <K extends keyof State>(k: K, v: State[K]) => setS((prev) => ({ ...prev, [k]: v }));
  const toggleIn = (k: ListKey, v: string) => setS((prev) => ({ ...prev, [k]: prev[k].includes(v) ? prev[k].filter((x) => x !== v) : [...prev[k], v] }));

  // Žáner / krajina: 1. klik = zahrnúť, 2. klik = vylúčiť, 3. klik = zrušiť
  function cycle(inc: 'genres' | 'countries', exc: 'exGenres' | 'exCountries', v: string) {
    setS((prev) => {
      if (prev[inc].includes(v)) return { ...prev, [inc]: prev[inc].filter((x) => x !== v), [exc]: [...prev[exc], v] };
      if (prev[exc].includes(v)) return { ...prev, [exc]: prev[exc].filter((x) => x !== v) };
      return { ...prev, [inc]: [...prev[inc], v] };
    });
  }

  function reset() {
    setS({ ...EMPTY, sort: s.sort });
  }

  const genreList = useMemo(() => {
    const base = options ? Object.keys(options.genres) : [];
    return base.sort((a, b) => (options!.genres[b] || 0) - (options!.genres[a] || 0));
  }, [options]);

  const countryList = useMemo(() => {
    const base = options ? Object.keys(options.countries) : [];
    const q = countrySearch.trim().toLowerCase();
    const filtered = q ? base.filter((c) => valueLabel(c).toLowerCase().includes(q) || c.toLowerCase().includes(q)) : base;
    const selected = [...s.countries, ...s.exCountries];
    const rest = filtered.filter((c) => !selected.includes(c));
    return [...selected, ...(showAllCountries || q ? rest : rest.slice(0, 14))];
  }, [options, countrySearch, showAllCountries, s.countries, s.exCountries]);

  // Čipy aktívnych filtrov (hore nad výsledkami)
  const activeChips: Array<{ label: string; clear: () => void }> = [];
  if (s.q.trim()) activeChips.push({ label: `„${s.q.trim()}“`, clear: () => set('q', '') });
  s.types.forEach((v) => activeChips.push({ label: valueLabel(v), clear: () => toggleIn('types', v) }));
  s.genres.forEach((v) => activeChips.push({ label: valueLabel(v), clear: () => toggleIn('genres', v) }));
  s.exGenres.forEach((v) => activeChips.push({ label: `bez: ${valueLabel(v)}`, clear: () => toggleIn('exGenres', v) }));
  s.countries.forEach((v) => activeChips.push({ label: valueLabel(v), clear: () => toggleIn('countries', v) }));
  s.exCountries.forEach((v) => activeChips.push({ label: `bez: ${valueLabel(v)}`, clear: () => toggleIn('exCountries', v) }));
  if (s.yearFrom || s.yearTo) activeChips.push({ label: `Rok ${s.yearFrom || '…'}–${s.yearTo || '…'}`, clear: () => setS((p) => ({ ...p, yearFrom: '', yearTo: '' })) });
  if (s.lenFrom || s.lenTo) activeChips.push({ label: `Délka ${s.lenFrom || '0'}–${s.lenTo || '∞'} min`, clear: () => setS((p) => ({ ...p, lenFrom: '', lenTo: '' })) });
  if (s.ratingFrom) activeChips.push({ label: `Hodnocení ${s.ratingFrom} %+`, clear: () => set('ratingFrom', '') });
  if (s.minVotes) activeChips.push({ label: `${Number(s.minVotes).toLocaleString('cs-CZ')}+ hlasů`, clear: () => set('minVotes', '') });
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
    hasTrivia: 'Se zajímavostmi'
  };
  FLAG_KEYS.forEach((k) => s[k] && activeChips.push({ label: flagLabels[k], clear: () => set(k, false) }));
  PEOPLE.forEach((p) => s[p.key] && activeChips.push({ label: `${p.label}: ${s[p.key]}`, clear: () => set(p.key, '') }));
  s.actors.forEach((a) => activeChips.push({ label: `Hraje: ${a}`, clear: () => toggleIn('actors', a) }));
  s.keywords.forEach((k) => activeChips.push({ label: `#${k}`, clear: () => toggleIn('keywords', k) }));

  const f = facets;
  const panel = (
    <div className="text-sm">
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

      <Section title="Rok" badge={s.yearFrom || s.yearTo ? 1 : 0}>
        <div className="flex flex-wrap gap-2 mb-3">
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
        <div className="flex items-center gap-2">
          <input
            type="number"
            inputMode="numeric"
            value={s.yearFrom}
            onChange={(e) => set('yearFrom', e.target.value)}
            placeholder={options ? String(options.yearMin) : 'od'}
            className="w-full bg-surface border border-line rounded-lg px-3 py-2 text-sm text-ink outline-none focus:border-accent"
          />
          <span className="text-muted">–</span>
          <input
            type="number"
            inputMode="numeric"
            value={s.yearTo}
            onChange={(e) => set('yearTo', e.target.value)}
            placeholder={options ? String(options.yearMax) : 'do'}
            className="w-full bg-surface border border-line rounded-lg px-3 py-2 text-sm text-ink outline-none focus:border-accent"
          />
        </div>
      </Section>

      <Section title="Hodnocení" badge={(s.ratingFrom ? 1 : 0) + (s.minVotes ? 1 : 0)}>
        <div className="flex items-center justify-between mb-1">
          <span className="text-muted text-xs">Minimálně</span>
          <span className="text-ink font-bold">{s.ratingFrom ? `${s.ratingFrom} %` : 'Bez omezení'}</span>
        </div>
        <input
          type="range"
          min={0}
          max={95}
          step={5}
          value={Number(s.ratingFrom || 0)}
          onChange={(e) => set('ratingFrom', e.target.value === '0' ? '' : e.target.value)}
          className="w-full accent-accent"
        />
        <div className="text-muted text-xs mt-3 mb-2">Minimální počet hlasů (aby výsledky nekazily tituly s pár hlasy)</div>
        <div className="flex flex-wrap gap-2">
          {VOTES.map((v) => (
            <Chip key={v.label} label={v.label} state={s.minVotes === v.value ? 'on' : 'off'} onClick={() => set('minVotes', v.value)} />
          ))}
        </div>
      </Section>

      <Section title="Délka" badge={s.lenFrom || s.lenTo ? 1 : 0} defaultOpen={false}>
        <div className="flex flex-wrap gap-2 mb-3">
          {LENGTHS.map((l) => {
            const on = s.lenFrom === (l.from ? String(l.from) : '') && s.lenTo === (l.to ? String(l.to) : '');
            return (
              <Chip
                key={l.label}
                label={l.label}
                state={on ? 'on' : 'off'}
                onClick={() => setS((p) => (on ? { ...p, lenFrom: '', lenTo: '' } : { ...p, lenFrom: l.from ? String(l.from) : '', lenTo: l.to ? String(l.to) : '' }))}
              />
            );
          })}
        </div>
        <div className="flex items-center gap-2">
          <input type="number" value={s.lenFrom} onChange={(e) => set('lenFrom', e.target.value)} placeholder="od min" className="w-full bg-surface border border-line rounded-lg px-3 py-2 text-sm text-ink outline-none focus:border-accent" />
          <span className="text-muted">–</span>
          <input type="number" value={s.lenTo} onChange={(e) => set('lenTo', e.target.value)} placeholder="do min" className="w-full bg-surface border border-line rounded-lg px-3 py-2 text-sm text-ink outline-none focus:border-accent" />
        </div>
      </Section>

      <Section title="Kde sledovat" badge={s.services.length + [s.cinema, s.online, s.subs, s.dub].filter(Boolean).length}>
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
      </Section>

      <Section title="Tvůrci a herci" badge={PEOPLE.filter((p) => s[p.key]).length + s.actors.length} defaultOpen={false}>
        <div className="space-y-3">
          <div>
            <div className="text-xs text-muted mb-1">Hrají (můžeš přidat víc herců)</div>
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

      <Section title="Klíčová slova" badge={s.keywords.length} defaultOpen={false}>
        <Suggest kind="keyword" placeholder="např. superhrdina, vesmír…" onPick={(n) => !s.keywords.includes(n) && set('keywords', [...s.keywords, n])} />
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

      <Section title="Obsah na webu" badge={[s.hasReviews, s.hasGallery, s.hasVideos, s.hasTrivia].filter(Boolean).length} defaultOpen={false}>
        <Toggle label="Má recenze" checked={s.hasReviews} onChange={(v) => set('hasReviews', v)} />
        <Toggle label="Má galerii" checked={s.hasGallery} onChange={(v) => set('hasGallery', v)} />
        <Toggle label="Má videa" checked={s.hasVideos} onChange={(v) => set('hasVideos', v)} />
        <Toggle label="Má zajímavosti" checked={s.hasTrivia} onChange={(v) => set('hasTrivia', v)} />
      </Section>
    </div>
  );

  return (
    <div className="border border-line border-t-0 rounded-b bg-card">
      {/* Hľadanie + zoradenie */}
      <div className="p-4 border-b border-line flex flex-col sm:flex-row gap-3 sm:items-center">
        <div className="flex-1 relative">
          <input
            value={s.q}
            onChange={(e) => set('q', e.target.value)}
            placeholder="Název filmu nebo seriálu (i bez diakritiky)…"
            className="w-full bg-surface border border-line rounded-xl pl-10 pr-3 py-2.5 text-sm text-ink placeholder:text-muted outline-none focus:border-accent"
          />
          <svg className="w-4 h-4 text-muted absolute left-3.5 top-1/2 -translate-y-1/2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3.6-3.6" />
          </svg>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setDrawer(true)}
            className="lg:hidden flex items-center gap-2 bg-surface border border-line rounded-xl px-4 py-2.5 text-sm font-semibold text-ink"
          >
            Filtry{activeCount ? <span className="bg-accent text-white text-[11px] rounded-full px-1.5">{activeCount}</span> : null}
          </button>
          <select
            value={s.sort}
            onChange={(e) => set('sort', e.target.value)}
            className="bg-surface border border-line rounded-xl px-3 py-2.5 text-sm font-semibold text-ink outline-none focus:border-accent"
          >
            {Object.entries(SORT_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="lg:grid lg:grid-cols-[290px_1fr]">
        {/* Panel filtrov — desktop */}
        <aside className="hidden lg:block border-r border-line px-4 py-2 max-h-[calc(100vh-120px)] overflow-y-auto sticky top-16 self-start">{panel}</aside>

        {/* Výsledky */}
        <section className="p-4 min-w-0">
          <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
            <div className="text-sm text-muted">
              {total === null ? 'Načítám…' : (
                <>
                  Nalezeno <strong className="text-ink">{total.toLocaleString('cs-CZ')}</strong>
                  {options ? ` z ${options.total.toLocaleString('cs-CZ')}` : ''} titulů
                </>
              )}
              {loading && total !== null && <span className="ml-2 inline-block w-3 h-3 rounded-full border-2 border-accent border-t-transparent animate-spin align-middle" />}
            </div>
            {activeChips.length > 0 && (
              <button type="button" onClick={reset} className="text-xs font-semibold text-accent hover:underline">
                Zrušit všechny filtry
              </button>
            )}
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
            </div>
          )}

          {!loading && total === 0 ? (
            <div className="border border-line rounded-xl p-8 text-center bg-surface">
              <div className="font-display text-lg font-bold text-ink mb-1">Nic jsme nenašli</div>
              <p className="text-sm text-muted">Zkus některý filtr uvolnit — například zrušit vyloučený žánr nebo snížit minimální hodnocení.</p>
            </div>
          ) : (
            <>
              <div className={`grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-7 transition-opacity ${loading ? 'opacity-60' : ''}`}>
                {items.map((m) => (
                  <Card key={m.id} m={m} />
                ))}
              </div>
              {page < pages && (
                <div className="flex justify-center mt-8">
                  <button
                    type="button"
                    onClick={loadMore}
                    disabled={loadingMore}
                    className="bg-surface border border-line hover:border-accent rounded-xl px-6 py-2.5 text-sm font-bold text-ink disabled:opacity-60"
                  >
                    {loadingMore ? 'Načítám…' : 'Načíst další'}
                  </button>
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

      {/* Panel filtrov — mobil (vysúvací) */}
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
    </div>
  );
}
