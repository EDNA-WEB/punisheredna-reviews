'use client';

import { useState } from 'react';
import Link from 'next/link';

type MovieItem = { id: string; title: string; slug: string; poster: string | null; year: string | null; contentType: string; hasSubtitles: boolean; hasDubbing: boolean };

export default function LocalizationAdminList({ movies: initialMovies }: { movies: MovieItem[] }) {
  const [movies, setMovies] = useState(initialMovies);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [query, setQuery] = useState('');

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
      alert('Zmena zlyhala. Skús to prosím znova.');
    } finally {
      setSavingId(null);
    }
  }

  const filtered = query.trim()
    ? movies.filter((m) => m.title.toLowerCase().includes(query.trim().toLowerCase()))
    : movies;

  return (
    <div>
      <input
        className="field-input-sm max-w-xs mb-4"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Hľadať podľa názvu…"
      />

      <div className="border border-line rounded-xl overflow-hidden divide-y divide-line">
        <div className="flex items-center gap-3 px-4 py-2 bg-surface text-[11px] font-bold uppercase tracking-wide text-muted">
          <span className="flex-1">Názov</span>
          <span className="w-20 text-center flex-none">Dabing</span>
          <span className="w-20 text-center flex-none">Titulky</span>
        </div>

        {filtered.map((m) => (
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

        {filtered.length === 0 && <div className="px-4 py-8 text-center text-sm text-muted">Nič sa nenašlo.</div>}
      </div>
    </div>
  );
}
