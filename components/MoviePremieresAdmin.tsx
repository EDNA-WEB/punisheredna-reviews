'use client';

import { useState } from 'react';
import BulkImportRunner from './BulkImportRunner';
import ClientPagination from './ClientPagination';

type PremiereRow = { country: string; type: string; releaseDate: string; distributor: string };
type MovieItem = {
  id: string;
  title: string;
  slug: string;
  poster: string | null;
  year: string | null;
  ageRating: string | null;
  tmdbId: number | null;
  contentType: string;
  premiereDates: { id: string; country: string; type?: string; releaseDate: string | Date; distributor: string | null }[];
};

const COUNTRIES = [
  { code: 'CZ', label: 'Česko' },
  { code: 'US', label: 'USA' },
  { code: 'WORLD', label: 'Svet (celosvetová premiéra)' }
];

const TYPES = [
  { code: 'KINO', label: 'Kino' },
  { code: 'VOD', label: 'VOD / streaming' }
];

function toDateInputValue(d: string | Date) {
  const date = new Date(d);
  return date.toISOString().slice(0, 10);
}

export default function MoviePremieresAdmin({ initialMovies }: { initialMovies: MovieItem[] }) {
  const [movies, setMovies] = useState(initialMovies);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [includeVod, setIncludeVod] = useState(false);
  const [allPreview, setAllPreview] = useState<{ count: number; sample: string[] } | null>(null);
  const [allBusy, setAllBusy] = useState(false);
  const [allDone, setAllDone] = useState<{ checked: number; batchId: string | null; results: { title: string; status: string; detail?: string }[] } | null>(null);
  const [allUndoStatus, setAllUndoStatus] = useState<'idle' | 'undoing' | 'done'>('idle');

  async function previewAllPremieres() {
    setAllBusy(true);
    setAllDone(null);
    try {
      const res = await fetch('/api/admin/movies/bulk-tmdb-premieres-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ includeVod, preview: true })
      });
      const data = await res.json();
      setAllPreview(data);
    } finally {
      setAllBusy(false);
    }
  }

  async function confirmAllPremieres() {
    setAllBusy(true);
    try {
      const res = await fetch('/api/admin/movies/bulk-tmdb-premieres-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ includeVod, preview: false })
      });
      const data = await res.json();
      setAllDone({ checked: data.checked, batchId: data.batchId || null, results: data.results });
      setAllPreview(null);
      setAllUndoStatus('idle');
    } finally {
      setAllBusy(false);
    }
  }

  async function undoAllPremieres() {
    if (!allDone?.batchId) return;
    setAllUndoStatus('undoing');
    try {
      const res = await fetch('/api/admin/bulk-import/undo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batchId: allDone.batchId })
      });
      if (!res.ok) throw new Error();
      setAllUndoStatus('done');
    } catch {
      setAllUndoStatus('idle');
      alert('Vrátenie späť zlyhalo.');
    }
  }

  const [recentImporting, setRecentImporting] = useState(false);
  const [recentResults, setRecentResults] = useState<{ title: string; status: string; detail?: string }[] | null>(null);
  const [recentChecked, setRecentChecked] = useState(0);

  async function handleTmdbRecentPremieres() {
    setRecentImporting(true);
    setRecentResults(null);
    try {
      const res = await fetch('/api/admin/movies/bulk-tmdb-premieres-recent', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Doplnenie zlyhalo.');
      setRecentResults(data.results);
      setRecentChecked(data.checked);
    } catch (err: any) {
      setRecentResults([{ title: '', status: 'CHYBA', detail: err.message || 'Doplnenie zlyhalo.' }]);
    } finally {
      setRecentImporting(false);
    }
  }
  const [openFor, setOpenFor] = useState<string | null>(null);
  const [ageRatingDrafts, setAgeRatingDrafts] = useState<Record<string, string>>({});
  const [rowDrafts, setRowDrafts] = useState<Record<string, PremiereRow[]>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [saveError, setSaveError] = useState('');
  const [suggesting, setSuggesting] = useState<string | null>(null);

  async function suggestFromTmdb(movieId: string) {
    setSuggesting(movieId);
    setSaveError('');
    try {
      const res = await fetch(`/api/movies/${movieId}/premieres/tmdb-suggest`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setRowDrafts((prev) => ({
        ...prev,
        [movieId]: data.premieres.map((p: any) => ({ country: p.country, type: p.type, releaseDate: p.releaseDate, distributor: '' }))
      }));
      if (data.ageRating) setAgeRatingDrafts((prev) => ({ ...prev, [movieId]: data.ageRating }));
      setOpenFor(movieId);
    } catch (err: any) {
      setSaveError(err.message || 'Návrh z TMDb zlyhal.');
    } finally {
      setSuggesting(null);
    }
  }

  const filteredMovies = movies.filter((m) => m.title.toLowerCase().includes(search.toLowerCase()));
  const PAGE_SIZE = 50;
  const totalPages = Math.max(1, Math.ceil(filteredMovies.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageMovies = filteredMovies.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  function openMovie(m: MovieItem) {
    if (openFor === m.id) {
      setOpenFor(null);
      return;
    }
    setOpenFor(m.id);
    if (!rowDrafts[m.id]) {
      setAgeRatingDrafts((prev) => ({ ...prev, [m.id]: m.ageRating || '' }));
      setRowDrafts((prev) => ({
        ...prev,
        [m.id]: m.premiereDates.map((p) => ({
          country: p.country,
          type: p.type || 'KINO',
          releaseDate: toDateInputValue(p.releaseDate),
          distributor: p.distributor || ''
        }))
      }));
    }
  }

  function addRow(movieId: string) {
    const movie = movies.find((m) => m.id === movieId);
    const defaultType = movie?.contentType === 'Seriál' ? 'VOD' : 'KINO';
    setRowDrafts((prev) => ({
      ...prev,
      [movieId]: [...(prev[movieId] || []), { country: 'CZ', type: defaultType, releaseDate: '', distributor: '' }]
    }));
  }

  function removeRow(movieId: string, idx: number) {
    setRowDrafts((prev) => ({ ...prev, [movieId]: prev[movieId].filter((_, i) => i !== idx) }));
  }

  function updateRow(movieId: string, idx: number, field: keyof PremiereRow, value: string) {
    setRowDrafts((prev) => ({
      ...prev,
      [movieId]: prev[movieId].map((r, i) => (i === idx ? { ...r, [field]: value } : r))
    }));
  }

  async function saveMovie(movieId: string) {
    const rows = rowDrafts[movieId] || [];
    setSaveError('');
    if (rows.some((r) => !r.releaseDate)) {
      setSaveError('Každá premiéra musí mať vyplnený dátum.');
      return;
    }
    setSaving(movieId);
    try {
      const res = await fetch(`/api/movies/${movieId}/premieres`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ageRating: ageRatingDrafts[movieId] || '', premieres: rows })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Uloženie zlyhalo.');
      setMovies((prev) =>
        prev.map((m) =>
          m.id === movieId
            ? {
                ...m,
                ageRating: ageRatingDrafts[movieId] || null,
                premiereDates: rows.map((r, i) => ({ id: `tmp-${i}`, country: r.country, type: r.type, releaseDate: r.releaseDate, distributor: r.distributor || null }))
              }
            : m
        )
      );
      setOpenFor(null);
    } catch (err: any) {
      setSaveError(err.message);
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="max-w-3xl">
      <div className="border border-line rounded-xl p-4 bg-surface mb-6">
        <div className="text-sm font-semibold text-ink mb-1">Doplniť premiéry z TMDb — všetky filmy</div>
        <div className="text-xs text-muted mb-3">
          Prejde všetky filmy/seriály bez akejkoľvek premiéry a doplní z TMDb len <strong>najskoršiu</strong> českú a
          americkú premiéru — žiadne opakované neskoršie uvedenia. Filmy, čo už premiéru majú, sa nedotknú.
        </div>
        <label className="flex items-center gap-2 text-xs text-ink mb-3 cursor-pointer">
          <input type="checkbox" checked={includeVod} onChange={(e) => setIncludeVod(e.target.checked)} />
          Zahrnúť aj VOD premiéru (bez zaškrtnutia sa doplní len kino premiéra)
        </label>

        {!allPreview && !allDone && (
          <button
            type="button"
            onClick={previewAllPremieres}
            disabled={allBusy}
            className="border border-line text-ink text-sm font-semibold px-5 py-2.5 rounded-full hover:border-accent hover:text-accent disabled:opacity-50"
          >
            {allBusy ? 'Načítavam…' : 'Zobraziť náhľad'}
          </button>
        )}

        {allPreview && !allDone && (
          <div>
            <div className="text-xs text-ink mb-2">
              Doplní sa <strong>{allPreview.count}</strong> filmov/seriálov. Ukážka prvých {allPreview.sample.length}:
            </div>
            <div className="text-xs text-muted mb-3 max-h-32 overflow-y-auto">{allPreview.sample.join(', ')}</div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={confirmAllPremieres}
                disabled={allBusy}
                className="bg-accent text-white text-sm font-semibold px-5 py-2.5 rounded-full hover:bg-accent-dark disabled:opacity-50"
              >
                {allBusy ? 'Doplňujem…' : `Potvrdiť a doplniť (${allPreview.count})`}
              </button>
              <button type="button" onClick={() => setAllPreview(null)} className="text-sm font-semibold text-muted hover:text-ink">
                Zrušiť
              </button>
            </div>
          </div>
        )}

        {allDone && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-semibold text-ink">Hotovo — skontrolovaných {allDone.checked} filmov/seriálov.</div>
              {allDone.batchId && allUndoStatus !== 'done' && (
                <button
                  type="button"
                  onClick={undoAllPremieres}
                  disabled={allUndoStatus === 'undoing'}
                  className="text-xs font-semibold text-danger border border-danger/40 rounded-full px-3 py-1.5 hover:bg-danger/10 disabled:opacity-50"
                >
                  {allUndoStatus === 'undoing' ? 'Vraciam späť…' : 'Vrátiť túto dávku späť'}
                </button>
              )}
              {allUndoStatus === 'done' && <span className="text-xs font-semibold text-emerald-600">Vrátené späť ✓</span>}
            </div>
            <div className="text-xs space-y-1 max-h-48 overflow-y-auto">
              {allDone.results.map((r, i) => (
                <div key={i} className={r.status === 'OK' ? 'text-ink' : 'text-danger'}>
                  <span className="font-semibold">{r.status}</span> — {r.title}
                  {r.detail ? `: ${r.detail}` : ''}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="border border-line rounded-xl p-4 bg-surface mb-6">
        <div className="text-sm font-semibold text-ink mb-1">Doplniť premiéry z TMDb — filmy za poslednú hodinu</div>
        <div className="text-xs text-muted mb-3">
          Prejde filmy pridané za posledných 60 minút, čo ešte nemajú žiadnu premiéru, a doplní ich automaticky z TMDb
          (ČR + USA). Staršie filmy ani tie, čo už premiéru majú, sa nedotknú.
        </div>
        <button
          type="button"
          onClick={handleTmdbRecentPremieres}
          disabled={recentImporting}
          className="bg-accent text-white text-sm font-semibold px-5 py-2.5 rounded-full hover:bg-accent-dark disabled:opacity-50"
        >
          {recentImporting ? 'Doplňujem…' : 'Doplniť premiéry (posledná hodina)'}
        </button>
        {recentResults && (
          <div className="mt-3 text-xs space-y-1 max-h-64 overflow-y-auto">
            <div className="text-muted mb-1">Skontrolovaných filmov: {recentChecked}</div>
            {recentResults.map((r, i) => (
              <div key={i} className={r.status === 'OK' ? 'text-ink' : 'text-danger'}>
                <span className="font-semibold">{r.status}</span> — {r.title}: {r.detail}
              </div>
            ))}
          </div>
        )}
      </div>

      <BulkImportRunner
        endpoint="/api/admin/movies/bulk-import-distributors"
        title="Hromadne priradiť distribútorov"
        description={'Vlož zoznam v tvare "Názov filmu – Distribútor ČR, Distribútor pôvodnej premiéry", jeden riadok na film. Prvý distribútor sa priradí k domácej premiére (ČR, potom SR), ďalší k nasledujúcej krajine v poradí — film musí mať dátumy premiér už pridané.'}
        placeholder={'Together – Bontonfilm, Neon'}
        buttonLabel="Priradiť distribútorov"
      />

      <input
        className="field-input mb-4"
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setPage(1);
        }}
        placeholder="Hľadať film…"
      />

      {saveError && <p className="text-danger text-xs mb-3">{saveError}</p>}

      <div className="border border-line rounded-xl overflow-hidden divide-y divide-line">
        {pageMovies.map((m) => {
          const rows = rowDrafts[m.id];
          return (
            <div key={m.id}>
              <div className="w-full flex items-center gap-3 p-3 hover:bg-surface">
                <button onClick={() => openMovie(m)} className="flex items-center gap-3 flex-1 min-w-0 text-left">
                  <div className="w-8 h-11 rounded bg-surface bg-cover bg-center flex-none" style={m.poster ? { backgroundImage: `url('${m.poster}')` } : undefined} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-ink truncate flex items-center gap-1.5">
                      {m.premiereDates.length === 0 && <span className="w-2 h-2 rounded-full bg-danger flex-none animate-pulse" title="Chýbajú premiéry" />}
                      {m.title} {m.year && <span className="text-muted font-normal">· {m.year}</span>}
                    </div>
                    <div className="text-xs text-muted">{m.premiereDates.length > 0 ? `${m.premiereDates.length} premiér nastavených` : 'Zatiaľ žiadne premiéry'}</div>
                  </div>
                </button>
                {m.tmdbId && (
                  <button
                    onClick={() => suggestFromTmdb(m.id)}
                    disabled={suggesting === m.id}
                    className="text-xs font-semibold text-accent hover:underline disabled:opacity-40 flex-none whitespace-nowrap"
                  >
                    {suggesting === m.id ? 'Naťahujem…' : 'Automaticky z TMDb'}
                  </button>
                )}
                <button onClick={() => openMovie(m)} className="text-muted text-xs flex-none">{openFor === m.id ? '▲' : '▼'}</button>
              </div>

              {openFor === m.id && rows && (
                <div className="p-4 bg-surface border-t border-line space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-ink mb-1">Vekové obmedzenie</label>
                    <input
                      className="field-input-sm"
                      value={ageRatingDrafts[m.id] || ''}
                      onChange={(e) => setAgeRatingDrafts((prev) => ({ ...prev, [m.id]: e.target.value }))}
                      placeholder="napr. Nevhodný mládeži do 15 let"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-ink">Premiéry v jednotlivých krajinách</label>
                    {rows.map((r, i) => (
                      <div key={i} className="flex flex-wrap items-center gap-2">
                        <select
                          className="field-input-sm w-32 flex-none"
                          value={r.country}
                          onChange={(e) => updateRow(m.id, i, 'country', e.target.value)}
                        >
                          {COUNTRIES.map((c) => (
                            <option key={c.code} value={c.code}>{c.label}</option>
                          ))}
                        </select>
                        <select
                          className="field-input-sm w-36 flex-none"
                          value={r.type}
                          onChange={(e) => updateRow(m.id, i, 'type', e.target.value)}
                        >
                          {TYPES.map((t) => (
                            <option key={t.code} value={t.code}>{t.label}</option>
                          ))}
                        </select>
                        <input
                          type="date"
                          className="field-input-sm w-40 flex-none"
                          value={r.releaseDate}
                          onChange={(e) => updateRow(m.id, i, 'releaseDate', e.target.value)}
                        />
                        <input
                          type="text"
                          className="field-input-sm flex-1 min-w-[160px]"
                          value={r.distributor}
                          onChange={(e) => updateRow(m.id, i, 'distributor', e.target.value)}
                          placeholder="Distribútor (voliteľné)"
                        />
                        <button onClick={() => removeRow(m.id, i)} className="text-muted hover:text-danger text-xs flex-none px-1">✕</button>
                      </div>
                    ))}
                    <button onClick={() => addRow(m.id)} className="text-accent text-xs font-semibold hover:underline">+ Pridať premiéru</button>
                  </div>

                  <button
                    onClick={() => saveMovie(m.id)}
                    disabled={saving === m.id}
                    className="bg-accent text-white text-xs font-semibold px-4 py-2 rounded-full hover:bg-accent-dark disabled:opacity-50"
                  >
                    {saving === m.id ? 'Ukladám…' : 'Uložiť'}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="mt-4">
        <ClientPagination currentPage={currentPage} totalPages={totalPages} onPageChange={setPage} />
      </div>
    </div>
  );
}
