'use client';

import { useState } from 'react';
import Link from 'next/link';
import ClientPagination from './ClientPagination';

type MovieItem = { id: string; title: string; slug: string; poster: string | null; year: string | null; contentType: string; hasSubtitles: boolean; hasDubbing: boolean };

export default function LocalizationAdminList({ movies: initialMovies }: { movies: MovieItem[] }) {
  const [movies, setMovies] = useState(initialMovies);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [oldPreview, setOldPreview] = useState<{ count: number; sample: string[] } | null>(null);
  const [oldBusy, setOldBusy] = useState(false);
  const [oldDone, setOldDone] = useState<{ count: number; batchId: string | null } | null>(null);
  const [oldUndoStatus, setOldUndoStatus] = useState<'idle' | 'undoing' | 'done'>('idle');

  async function previewOldMovies() {
    setOldBusy(true);
    setOldDone(null);
    try {
      const res = await fetch('/api/admin/movies/bulk-localize-old', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preview: true })
      });
      const data = await res.json();
      setOldPreview(data);
    } finally {
      setOldBusy(false);
    }
  }

  async function confirmOldMovies() {
    setOldBusy(true);
    try {
      const res = await fetch('/api/admin/movies/bulk-localize-old', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preview: false })
      });
      const data = await res.json();
      setOldDone({ count: data.count, batchId: data.batchId || null });
      setOldPreview(null);
      setOldUndoStatus('idle');
      // Lokálne premietneme zmenu aj do zobrazeného zoznamu, nech to sedí bez reloadu.
      setMovies((prev) =>
        prev.map((m) => {
          const startYear = parseInt((m.year || '').slice(0, 4), 10);
          return !Number.isNaN(startYear) && startYear < 2025 ? { ...m, hasSubtitles: true, hasDubbing: true } : m;
        })
      );
    } finally {
      setOldBusy(false);
    }
  }

  async function undoOldMovies() {
    if (!oldDone?.batchId) return;
    setOldUndoStatus('undoing');
    try {
      const res = await fetch('/api/admin/bulk-import/undo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batchId: oldDone.batchId })
      });
      if (!res.ok) throw new Error();
      setOldUndoStatus('done');
    } catch {
      setOldUndoStatus('idle');
      alert('Vrácení zpět se nezdařilo.');
    }
  }

  async function toggle(movieId: string, field: 'hasSubtitles' | 'hasDubbing', current: boolean) {
    setSavingId(movieId);
    const next = !current;
    setMovies((prev) => prev.map((m) => (m.id === movieId ? { ...m, [field]: next } : m)));
    try {
      const res = await fetch(`/api/movies/${movieId}/localization`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: next })
      });
      if (!res.ok) throw new Error();
    } catch {
      setMovies((prev) => prev.map((m) => (m.id === movieId ? { ...m, [field]: current } : m)));
      alert('Změna se nezdařila. Zkus to prosím znovu.');
    } finally {
      setSavingId(null);
    }
  }

  const filtered = query.trim()
    ? movies.filter((m) => m.title.toLowerCase().includes(query.trim().toLowerCase()))
    : movies;

  const PAGE_SIZE = 50;
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <div>
      <div className="border border-line rounded-xl p-4 bg-surface mb-6">
        <div className="text-sm font-semibold text-ink mb-1">Označit starší filmy jako dabing + titulky</div>
        <div className="text-xs text-muted mb-3">
          Jednorázově označí všechny filmy a seriály starší než rok 2025 (kde ještě není nastavené obojí), že mají český dabing i titulky. Neovlivní filmy z roku 2025 a novější.
        </div>

        {!oldPreview && !oldDone && (
          <button
            type="button"
            onClick={previewOldMovies}
            disabled={oldBusy}
            className="border border-line text-ink text-sm font-semibold px-5 py-2.5 rounded-full hover:border-accent hover:text-accent disabled:opacity-50"
          >
            {oldBusy ? 'Načítavam…' : 'Zobrazit náhled'}
          </button>
        )}

        {oldPreview && !oldDone && (
          <div>
            <div className="text-xs text-ink mb-2">
              Změní se <strong>{oldPreview.count}</strong> filmů/seriálů. Ukázka prvních {oldPreview.sample.length}:
            </div>
            <div className="text-xs text-muted mb-3 max-h-32 overflow-y-auto">{oldPreview.sample.join(', ')}</div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={confirmOldMovies}
                disabled={oldBusy}
                className="bg-accent text-white text-sm font-semibold px-5 py-2.5 rounded-full hover:bg-accent-dark disabled:opacity-50"
              >
                {oldBusy ? 'Ukládám…' : `Potvrdit a uložit (${oldPreview.count})`}
              </button>
              <button
                type="button"
                onClick={() => setOldPreview(null)}
                className="text-sm font-semibold text-muted hover:text-ink"
              >
                Zrušit
              </button>
            </div>
          </div>
        )}

        {oldDone && (
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold text-ink">Hotovo — upravených {oldDone.count} filmů/seriálů.</div>
            {oldDone.batchId && oldUndoStatus !== 'done' && (
              <button
                type="button"
                onClick={undoOldMovies}
                disabled={oldUndoStatus === 'undoing'}
                className="text-xs font-semibold text-danger border border-danger/40 rounded-full px-3 py-1.5 hover:bg-danger/10 disabled:opacity-50"
              >
                {oldUndoStatus === 'undoing' ? 'Vracím zpět…' : 'Vrátit tuto dávku zpět'}
              </button>
            )}
            {oldUndoStatus === 'done' && <span className="text-xs font-semibold text-emerald-600">Vráceno zpět ✓</span>}
          </div>
        )}
      </div>

      <input
        className="field-input-sm max-w-xs mb-4"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setPage(1);
        }}
        placeholder="Hledat podle názvu…"
      />

      <div className="border border-line rounded-xl overflow-hidden divide-y divide-line">
        <div className="flex items-center gap-3 px-4 py-2 bg-surface text-[11px] font-bold uppercase tracking-wide text-muted">
          <span className="flex-1">Název</span>
          <span className="w-20 text-center flex-none">Dabing</span>
          <span className="w-20 text-center flex-none">Titulky</span>
        </div>

        {paged.map((m) => (
          <div key={m.id} className="flex items-center gap-3 px-4 py-2.5 bg-card">
            <div
              className="w-8 h-11 rounded bg-surface bg-cover bg-center flex-none"
              style={m.poster ? { backgroundImage: `url('${m.poster}')` } : undefined}
            />
            <Link href={`/movie/${m.slug}`} target="_blank" className="flex-1 min-w-0 text-sm font-semibold text-ink hover:text-accent truncate">
              {m.title} {m.year && <span className="text-muted font-normal">{m.year}</span>}
              {m.contentType !== 'Film' && (
                <span className="text-[10px] font-semibold text-accent border border-accent/40 px-1.5 py-0.5 rounded-full ml-1.5">{m.contentType}</span>
              )}
            </Link>
            <label className="w-20 flex items-center justify-center flex-none">
              <input
                type="checkbox"
                checked={m.hasDubbing}
                onChange={() => toggle(m.id, 'hasDubbing', m.hasDubbing)}
                disabled={savingId === m.id}
                className="w-4 h-4 accent-accent cursor-pointer"
              />
            </label>
            <label className="w-20 flex items-center justify-center flex-none">
              <input
                type="checkbox"
                checked={m.hasSubtitles}
                onChange={() => toggle(m.id, 'hasSubtitles', m.hasSubtitles)}
                disabled={savingId === m.id}
                className="w-4 h-4 accent-accent cursor-pointer"
              />
            </label>
          </div>
        ))}

        {filtered.length === 0 && <div className="px-4 py-8 text-center text-sm text-muted">Nic se nenašlo.</div>}
      </div>
      <div className="mt-4">
        <ClientPagination currentPage={currentPage} totalPages={totalPages} onPageChange={setPage} />
      </div>
    </div>
  );
}
