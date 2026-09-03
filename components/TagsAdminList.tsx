'use client';

import { useState } from 'react';

type MovieItem = { id: string; title: string; slug: string; poster: string | null; year: string | null; tags: string | null; tmdbId: number | null };

export default function TagsAdminList({ initialMovies }: { initialMovies: MovieItem[] }) {
  const [movies, setMovies] = useState(initialMovies);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [suggesting, setSuggesting] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  function tagsFor(m: MovieItem) {
    return drafts[m.id] ?? m.tags ?? '';
  }

  async function suggestFromTmdb(movieId: string) {
    setSuggesting(movieId);
    try {
      const res = await fetch(`/api/movies/${movieId}/tags/tmdb-suggest`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setDrafts((prev) => ({ ...prev, [movieId]: data.tags }));
    } catch (err: any) {
      alert(err.message || 'Návrh tagov z TMDb zlyhal.');
    } finally {
      setSuggesting(null);
    }
  }

  async function save(movieId: string) {
    setSaving(movieId);
    try {
      const res = await fetch(`/api/movies/${movieId}/tags`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tags: drafts[movieId] ?? '' })
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setMovies((prev) => prev.map((m) => (m.id === movieId ? { ...m, tags: data.tags } : m)));
    } catch {
      alert('Uloženie tagov zlyhalo. Skús to prosím znova.');
    } finally {
      setSaving(null);
    }
  }

  const filtered = query.trim()
    ? movies.filter((m) => m.title.toLowerCase().includes(query.trim().toLowerCase()))
    : movies;

  return (
    <div>
      <input
        className="field-input-sm max-w-sm mb-4"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Hľadať film/seriál…"
      />

      <div className="border border-line rounded-xl overflow-hidden">
        <div className="divide-y divide-line">
          {filtered.map((m) => {
            const isDirty = drafts[m.id] !== undefined && drafts[m.id] !== (m.tags ?? '');
            return (
              <div key={m.id} className="flex items-center gap-3 p-3">
                <div
                  className="w-9 h-12 rounded bg-surface bg-cover bg-center flex-none"
                  style={m.poster ? { backgroundImage: `url('${m.poster}')` } : undefined}
                />
                <div className="w-48 flex-none">
                  <div className="text-sm font-semibold text-ink truncate">{m.title}</div>
                  {m.year && <div className="text-xs text-muted">{m.year}</div>}
                </div>
                <input
                  className="field-input-sm flex-1"
                  value={tagsFor(m)}
                  onChange={(e) => setDrafts((prev) => ({ ...prev, [m.id]: e.target.value }))}
                  placeholder="napr. Marvel, superhrdinovia, vesmír"
                />
                {m.tmdbId && (
                  <button
                    onClick={() => suggestFromTmdb(m.id)}
                    disabled={suggesting === m.id}
                    title="Navrhne preložené tagy z TMDb kľúčových slov"
                    className="text-xs font-semibold text-accent hover:underline disabled:opacity-40 flex-none"
                  >
                    {suggesting === m.id ? 'Naťahujem…' : 'Automaticky z TMDb'}
                  </button>
                )}
                <button
                  onClick={() => save(m.id)}
                  disabled={saving === m.id || !isDirty}
                  className="bg-accent text-white text-xs font-semibold px-4 py-2 rounded-full hover:bg-accent-dark disabled:opacity-40 flex-none"
                >
                  {saving === m.id ? 'Ukladám…' : 'Uložiť'}
                </button>
              </div>
            );
          })}
          {filtered.length === 0 && <p className="text-sm text-muted p-4">Žiadny film/seriál sa nenašiel.</p>}
        </div>
      </div>
    </div>
  );
}
