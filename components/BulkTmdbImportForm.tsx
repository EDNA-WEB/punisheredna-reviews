'use client';

import { useState } from 'react';
import Link from 'next/link';

const MAX_MOVIES = 100;

type ResultRow = {
  title: string;
  status: 'pending' | 'searching' | 'saving' | 'done' | 'notfound' | 'error';
  message?: string;
  slug?: string;
};

export default function BulkTmdbImportForm() {
  const [namesText, setNamesText] = useState('');
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<ResultRow[]>([]);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [trimmedNotice, setTrimmedNotice] = useState('');

  async function importOne(title: string): Promise<ResultRow> {
    try {
      const searchRes = await fetch(`/api/admin/tmdb-search?query=${encodeURIComponent(title)}`);
      const searchData = await searchRes.json();
      if (!searchRes.ok) throw new Error(searchData.error || 'Vyhľadávanie zlyhalo.');
      if (!searchData.length) return { title, status: 'notfound', message: 'Na TMDb sa nenašiel žiadny výsledok.' };

      const best = searchData[0];

      const detailsRes = await fetch(`/api/admin/tmdb-details/${best.mediaType}/${best.id}`);
      const details = await detailsRes.json();
      if (!detailsRes.ok) throw new Error(details.error || 'Načítanie detailu zlyhalo.');

      const contentType = best.mediaType === 'tv' ? 'Seriál' : 'Film';

      const createRes = await fetch('/api/movies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...details, contentType })
      });
      const created = await createRes.json();
      if (!createRes.ok) throw new Error(created.error || 'Uloženie filmu zlyhalo.');

      // Doplnkovo pridá trailer a fotky, rovnako ako pri jednotlivom importe — chyby tu nezastavia proces.
      if (details.trailerUrl) {
        await fetch(`/api/movies/${created.id}/videos`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: details.trailerUrl, category: 'trailer', title: details.trailerTitle || null })
        }).catch(() => {});
      }
      if (details.photoUrls?.length) {
        for (const photoUrl of details.photoUrls) {
          await fetch(`/api/movies/${created.id}/photos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ full: photoUrl })
          }).catch(() => {});
        }
      }

      return { title, status: 'done', slug: created.slug, message: `${details.title} (${details.year || '?'})` };
    } catch (err: any) {
      return { title, status: 'error', message: err.message || 'Neznáma chyba.' };
    }
  }

  async function startImport() {
    let titles = namesText
      .split('\n')
      .map((t) => t.trim())
      .filter(Boolean);
    if (titles.length === 0) return;

    if (titles.length > MAX_MOVIES) {
      setTrimmedNotice(`Zoznam mal ${titles.length} filmov — spracujem prvých ${MAX_MOVIES}, zvyšok vlož znova v ďalšej dávke.`);
      titles = titles.slice(0, MAX_MOVIES);
    } else {
      setTrimmedNotice('');
    }

    setRunning(true);
    setResults(titles.map((title) => ({ title, status: 'pending' })));
    setProgress({ done: 0, total: titles.length });

    for (let i = 0; i < titles.length; i++) {
      setResults((prev) => prev.map((r, idx) => (idx === i ? { ...r, status: 'searching' } : r)));
      const result = await importOne(titles[i]);
      setResults((prev) => prev.map((r, idx) => (idx === i ? result : r)));
      setProgress({ done: i + 1, total: titles.length });

      // Krátka pauza medzi filmami, nech dopytovanie TMDb nie je príliš rýchle
      // za sebou — pri väčších dávkach (desiatky až 100 filmov) je to slušnejšie
      // aj spoľahlivejšie ako spustiť všetko úplne bez prestávky.
      if (i < titles.length - 1) await new Promise((resolve) => setTimeout(resolve, 350));
    }

    setRunning(false);
  }

  return (
    <div>
      <div className="border border-line rounded-xl p-4 mb-6 bg-surface">
        <h2 className="text-sm font-bold text-ink mb-1">Hromadný import z TMDb</h2>
        <p className="text-xs text-muted mb-3">
          Napíš názvy filmov/seriálov, každý na nový riadok (max. {MAX_MOVIES} naraz). Pre každý sa použije najlepšia
          zhoda na TMDb a automaticky sa vytvorí film — vrátane trailera a fotiek. Odporúčame potom každý skontrolovať
          v administrácii.
        </p>
        {trimmedNotice && <p className="text-xs text-amber-600 mb-3">{trimmedNotice}</p>}
        <textarea
          value={namesText}
          onChange={(e) => setNamesText(e.target.value)}
          disabled={running}
          placeholder={'Stranger Things\nInception\nThe Batman\n…'}
          className="field-input min-h-[180px] font-mono text-sm"
        />
        <button
          onClick={startImport}
          disabled={running || !namesText.trim()}
          className="mt-3 bg-accent text-white text-sm font-semibold px-5 py-2.5 rounded-full hover:bg-accent-dark disabled:opacity-50"
        >
          {running ? 'Importujem…' : 'Spustiť hromadný import'}
        </button>
      </div>

      {results.length > 0 && (
        <div className="border border-line rounded-xl overflow-hidden">
          <div className="bg-surface px-4 py-2.5 flex items-center justify-between">
            <span className="font-display font-bold text-sm text-ink">Priebeh</span>
            {running && (
              <span className="text-xs font-semibold text-muted">
                {progress.done} / {progress.total}
              </span>
            )}
          </div>
          {running && progress.total > 0 && (
            <div className="h-1 bg-line">
              <div
                className="h-1 bg-accent transition-all duration-300"
                style={{ width: `${(progress.done / progress.total) * 100}%` }}
              />
            </div>
          )}
          <div className="divide-y divide-line">
            {results.map((r, i) => (
              <div key={i} className="px-4 py-3 flex items-center gap-3 text-sm">
                <span className="flex-none w-5 text-center">
                  {r.status === 'pending' && <span className="text-muted">•</span>}
                  {r.status === 'searching' || r.status === 'saving' ? <span className="text-accent">…</span> : null}
                  {r.status === 'done' && <span className="text-emerald-600">✓</span>}
                  {r.status === 'notfound' && <span className="text-amber-600">?</span>}
                  {r.status === 'error' && <span className="text-danger">✕</span>}
                </span>
                <span className="flex-none font-medium text-ink w-40 truncate">{r.title}</span>
                <span className="text-muted flex-1 truncate">
                  {r.status === 'done' && r.slug ? (
                    <Link href={`/movie/${r.slug}`} className="text-accent hover:underline">
                      {r.message}
                    </Link>
                  ) : (
                    r.message || (r.status === 'pending' ? 'Čaká…' : r.status === 'searching' ? 'Hľadám na TMDb…' : '')
                  )}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
