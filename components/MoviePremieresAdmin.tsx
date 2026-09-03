'use client';

import { useState } from 'react';

type PremiereRow = { country: string; type: string; releaseDate: string; distributor: string };
type MovieItem = {
  id: string;
  title: string;
  slug: string;
  poster: string | null;
  year: string | null;
  ageRating: string | null;
  tmdbId: number | null;
  premiereDates: { id: string; country: string; type?: string; releaseDate: string | Date; distributor: string | null }[];
};

const COUNTRIES = [
  { code: 'CZ', label: 'Česko' },
  { code: 'US', label: 'USA' },
  { code: 'GB', label: 'Veľká Británia' },
  { code: 'SK', label: 'Slovensko' },
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
    setRowDrafts((prev) => ({
      ...prev,
      [movieId]: [...(prev[movieId] || []), { country: 'CZ', type: 'KINO', releaseDate: '', distributor: '' }]
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
      <input
        className="field-input mb-4"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Hľadať film…"
      />

      {saveError && <p className="text-danger text-xs mb-3">{saveError}</p>}

      <div className="border border-line rounded-xl overflow-hidden divide-y divide-line">
        {filteredMovies.slice(0, 50).map((m) => {
          const rows = rowDrafts[m.id];
          return (
            <div key={m.id}>
              <div className="w-full flex items-center gap-3 p-3 hover:bg-surface">
                <button onClick={() => openMovie(m)} className="flex items-center gap-3 flex-1 min-w-0 text-left">
                  <div className="w-8 h-11 rounded bg-surface bg-cover bg-center flex-none" style={m.poster ? { backgroundImage: `url('${m.poster}')` } : undefined} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-ink truncate">{m.title} {m.year && <span className="text-muted font-normal">· {m.year}</span>}</div>
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
      {filteredMovies.length > 50 && (
        <p className="text-xs text-muted mt-2">Zobrazených prvých 50 výsledkov — hľadaj presnejšie, ak nevidíš svoj film.</p>
      )}
    </div>
  );
}
