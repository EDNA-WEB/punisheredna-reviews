'use client';

import { useState, useRef } from 'react';
import { formatMoney } from '@/lib/boxOffice';

type MovieOption = { id: string; title: string; year: string | null; poster: string | null };
type CompareData = {
  movie: MovieOption & { budget: number | null; marketingBudget: number | null; boxOffice: number | null };
  releaseYear: number;
  stats: {
    earned: number;
    totalCost: number;
    studioTheatricalRevenue: number;
    ancillaryRevenue: number;
    totalStudioRevenue: number;
    profit: number;
    profitable: boolean;
  } | null;
  adjusted: {
    earned: number;
    totalCost: number;
    studioTheatricalRevenue: number;
    ancillaryRevenue: number;
    totalStudioRevenue: number;
    profit: number;
  } | null;
  profitRatio: number | null;
};

function MoviePicker({ label, onPick, picked }: { label: string; onPick: (m: MovieOption) => void; picked: MovieOption | null }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<MovieOption[]>([]);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleChange(value: string) {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.trim().length < 2) {
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      const res = await fetch(`/api/box-office/search?q=${encodeURIComponent(value)}`);
      if (res.ok) setResults(await res.json());
    }, 250);
  }

  if (picked) {
    return (
      <div className="border border-line rounded-xl p-3 flex items-center gap-3">
        <div className="w-10 h-14 rounded bg-surface bg-cover bg-center flex-none" style={picked.poster ? { backgroundImage: `url('${picked.poster}')` } : undefined} />
        <div className="flex-1 min-w-0">
          <div className="text-xs text-muted">{label}</div>
          <div className="text-sm font-semibold text-ink truncate">{picked.title} {picked.year && <span className="text-muted font-normal">· {picked.year}</span>}</div>
        </div>
        <button type="button" onClick={() => onPick(null as any)} className="text-muted hover:text-danger text-xs flex-none">Zmeniť</button>
      </div>
    );
  }

  return (
    <div className="relative">
      <label className="block text-xs font-semibold text-ink mb-1.5">{label}</label>
      <input
        className="field-input"
        value={query}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Hľadaj film podľa názvu…"
      />
      {open && results.length > 0 && (
        <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-card border border-line rounded-xl shadow-lg overflow-hidden max-h-64 overflow-y-auto">
          {results.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => {
                onPick(m);
                setQuery('');
                setResults([]);
              }}
              className="w-full flex items-center gap-2.5 p-2.5 hover:bg-surface text-left"
            >
              <div className="w-8 h-11 rounded bg-surface bg-cover bg-center flex-none" style={m.poster ? { backgroundImage: `url('${m.poster}')` } : undefined} />
              <span className="text-sm text-ink truncate">{m.title} {m.year && <span className="text-muted">· {m.year}</span>}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Row({ label, a, b, aBetter, bBetter }: { label: string; a: string; b: string; aBetter?: boolean; bBetter?: boolean }) {
  return (
    <div className="grid grid-cols-[1fr_auto_1fr] gap-3 py-2 border-b border-line last:border-b-0 items-center">
      <div className={`text-sm text-right ${aBetter ? 'font-bold text-emerald-600' : 'text-ink'}`}>{a}</div>
      <div className="text-[10px] text-muted uppercase tracking-wide px-2 whitespace-nowrap">{label}</div>
      <div className={`text-sm text-left ${bBetter ? 'font-bold text-emerald-600' : 'text-ink'}`}>{b}</div>
    </div>
  );
}

export default function BoxOfficeCompareTool() {
  const [pickedA, setPickedA] = useState<MovieOption | null>(null);
  const [pickedB, setPickedB] = useState<MovieOption | null>(null);
  const [data, setData] = useState<{ a: CompareData; b: CompareData } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function compare(a: MovieOption, b: MovieOption) {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/box-office/compare?a=${a.id}&b=${b.id}`);
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      setData(result);
    } catch (err: any) {
      setError(err.message || 'Porovnanie zlyhalo.');
    } finally {
      setLoading(false);
    }
  }

  function pickA(m: MovieOption | null) {
    setPickedA(m);
    setData(null);
    if (m && pickedB) compare(m, pickedB);
  }
  function pickB(m: MovieOption | null) {
    setPickedB(m);
    setData(null);
    if (pickedA && m) compare(pickedA, m);
  }

  return (
    <div>
      <div className="grid sm:grid-cols-2 gap-4 mb-6">
        <MoviePicker label="Prvý film" picked={pickedA} onPick={pickA} />
        <MoviePicker label="Druhý film" picked={pickedB} onPick={pickB} />
      </div>

      {loading && <p className="text-sm text-muted">Porovnávam…</p>}
      {error && <p className="text-sm text-danger">{error}</p>}

      {data && data.a.stats && data.b.stats && data.a.adjusted && data.b.adjusted && (
        <div className="border border-line rounded-xl p-5 bg-card">
          <div className="grid grid-cols-[1fr_auto_1fr] gap-3 mb-4 items-end">
            <div className="text-right">
              <div className="font-display font-bold text-ink">{data.a.movie.title}</div>
              <div className="text-xs text-muted">{data.a.releaseYear}</div>
            </div>
            <div className="text-xs text-muted px-2">vs</div>
            <div className="text-left">
              <div className="font-display font-bold text-ink">{data.b.movie.title}</div>
              <div className="text-xs text-muted">{data.b.releaseYear}</div>
            </div>
          </div>

          <p className="text-xs text-muted text-center mb-3 pb-3 border-b border-line">
            Filmy vznikli v rôznych rokoch — pre férové porovnanie sú sumy nižšie prepočítané na dnešnú hodnotu peňazí (inflácia).
          </p>

          <Row
            label="Rozpočet (dnes)"
            a={formatMoney(data.a.adjusted.totalCost)}
            b={formatMoney(data.b.adjusted.totalCost)}
          />
          <Row
            label="Tržby z kín (dnes)"
            a={formatMoney(data.a.adjusted.earned)}
            b={formatMoney(data.b.adjusted.earned)}
            aBetter={data.a.adjusted.earned > data.b.adjusted.earned}
            bBetter={data.b.adjusted.earned > data.a.adjusted.earned}
          />
          <Row
            label="Podiel štúdia z kín (dnes)"
            a={formatMoney(data.a.adjusted.studioTheatricalRevenue)}
            b={formatMoney(data.b.adjusted.studioTheatricalRevenue)}
          />
          <Row
            label="Sekundárne príjmy (dnes)"
            a={formatMoney(data.a.adjusted.ancillaryRevenue)}
            b={formatMoney(data.b.adjusted.ancillaryRevenue)}
          />
          <Row
            label="Zisk štúdia (dnes)"
            a={formatMoney(data.a.adjusted.profit)}
            b={formatMoney(data.b.adjusted.profit)}
            aBetter={data.a.adjusted.profit > data.b.adjusted.profit}
            bBetter={data.b.adjusted.profit > data.a.adjusted.profit}
          />
          <Row
            label="Návratnosť (zisk / náklady)"
            a={data.a.profitRatio !== null ? `${(data.a.profitRatio * 100).toFixed(0)} %` : '—'}
            b={data.b.profitRatio !== null ? `${(data.b.profitRatio * 100).toFixed(0)} %` : '—'}
            aBetter={data.a.profitRatio !== null && data.b.profitRatio !== null && data.a.profitRatio > data.b.profitRatio}
            bBetter={data.a.profitRatio !== null && data.b.profitRatio !== null && data.b.profitRatio > data.a.profitRatio}
          />

          <div className="mt-4 pt-4 border-t border-line text-center">
            {data.a.profitRatio !== null && data.b.profitRatio !== null ? (
              <p className="text-sm font-semibold text-ink">
                {data.a.profitRatio === data.b.profitRatio
                  ? 'Oba filmy dosiahli rovnakú návratnosť vzhľadom na svoje náklady.'
                  : `${data.a.profitRatio > data.b.profitRatio ? data.a.movie.title : data.b.movie.title} bol úspešnejší — vyššia návratnosť vzhľadom na náklady, prepočítané na dnešnú hodnotu peňazí.`}
              </p>
            ) : (
              <p className="text-sm text-muted">Na jednoznačné porovnanie chýbajú niektoré údaje.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
