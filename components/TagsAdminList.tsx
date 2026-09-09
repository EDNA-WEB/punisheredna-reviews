'use client';

import { useState } from 'react';

type MovieItem = { id: string; title: string; slug: string; poster: string | null; year: string | null; tags: string | null; tmdbId: number | null };

export default function TagsAdminList({ initialMovies }: { initialMovies: MovieItem[] }) {
  const [movies, setMovies] = useState(initialMovies);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [suggesting, setSuggesting] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [bulkTagsText, setBulkTagsText] = useState('');
  const [bulkImporting, setBulkImporting] = useState(false);
  const [bulkResults, setBulkResults] = useState<{ line: string; status: string; detail?: string }[] | null>(null);

  async function handleBulkImportTags() {
    setBulkImporting(true);
    setBulkResults(null);
    try {
      const res = await fetch('/api/admin/movies/bulk-import-tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: bulkTagsText })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Import zlyhal.');
      setBulkResults(data.results);
      setMovies((prev) =>
        prev.map((m) => {
          const found = data.results.find((r: any) => r.status === 'OK' && r.detail?.startsWith(`${m.title}:`));
          return found ? { ...m, tags: found.detail.slice(m.title.length + 2) } : m;
        })
      );
    } catch (err: any) {
      setBulkResults([{ line: '', status: 'CHYBA', detail: err.message || 'Import zlyhal.' }]);
    } finally {
      setBulkImporting(false);
    }
  }

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
      <div className="border border-line rounded-xl p-4 bg-surface mb-6">
        <div className="text-sm font-semibold text-ink mb-1">Hromadne pridať vlastné tagy</div>
        <div className="text-xs text-muted mb-3">
          Vlož zoznam v tvare <code>Názov filmu – tag1, tag2, tag3</code>, jeden riadok na film. Nové tagy sa pridajú k už
          existujúcim, nič sa neprepíše.
        </div>
        <textarea
          value={bulkTagsText}
          onChange={(e) => setBulkTagsText(e.target.value)}
          rows={5}
          placeholder={'Batman – Batman, Joker, hádanka, kladivo, policie'}
          className="w-full border border-line rounded-lg px-3 py-2 text-sm font-mono mb-3"
        />
        <button
          type="button"
          onClick={handleBulkImportTags}
          disabled={bulkImporting || !bulkTagsText.trim()}
          className="bg-accent text-white text-sm font-semibold px-5 py-2.5 rounded-full hover:bg-accent-dark disabled:opacity-50"
        >
          {bulkImporting ? 'Priraďujem…' : 'Priradiť tagy'}
        </button>
        {bulkResults && (
          <div className="mt-3 text-xs space-y-1 max-h-64 overflow-y-auto">
            {bulkResults.map((r, i) => (
              <div key={i} className={r.status === 'OK' ? 'text-ink' : 'text-danger'}>
                <span className="font-semibold">{r.status}</span> — {r.detail || r.line}
              </div>
            ))}
          </div>
        )}
      </div>

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
