'use client';

import { useState, useEffect, useRef } from 'react';
import { IconSearch, IconPlus } from './Icons';

type Result = { id: string; title: string; slug: string; year: string | null; poster: string | null };

export default function MovieListAddSearch({ listId, onAdded }: { listId: string; onAdded: (movie: Result) => void }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Result[]>([]);
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);
  const [error, setError] = useState('');
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    const timeout = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(query.trim())}`)
        .then((res) => res.json())
        .then((data) => setResults(Array.isArray(data?.movies) ? data.movies : []))
        .catch(() => {});
    }, 300);
    return () => clearTimeout(timeout);
  }, [query]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  async function addMovie(movie: Result) {
    setAdding(movie.id);
    setError('');
    try {
      const res = await fetch(`/api/movie-lists/${listId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ movieId: movie.id })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Pridanie zlyhalo.');
      onAdded(movie);
      setQuery('');
      setResults([]);
      setOpen(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setAdding(null);
    }
  }

  return (
    <div className="relative" ref={boxRef}>
      <div className="relative">
        <IconSearch className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          className="field-input-sm"
          style={{ paddingLeft: '2.25rem' }}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Hľadaj film na pridanie do zoznamu…"
        />
      </div>

      {error && <div className="text-danger text-xs mt-1.5">{error}</div>}

      {open && results.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-1 border border-line rounded-xl bg-card shadow-lg overflow-hidden z-20 max-h-72 overflow-y-auto">
          {results.map((m) => (
            <div key={m.id} className="flex items-center gap-3 px-3 py-2 hover:bg-surface">
              <div className="w-8 h-11 rounded bg-surface bg-cover bg-center flex-none" style={m.poster ? { backgroundImage: `url('${m.poster}')` } : undefined} />
              <div className="min-w-0 flex-1 text-sm text-ink truncate">
                {m.title} {m.year && <span className="text-muted">{m.year}</span>}
              </div>
              <button
                type="button"
                onClick={() => addMovie(m)}
                disabled={adding === m.id}
                title="Pridať do zoznamu"
                aria-label="Pridať do zoznamu"
                className="w-7 h-7 rounded-full flex items-center justify-center text-white bg-accent hover:bg-accent-dark disabled:opacity-50 flex-none"
              >
                <IconPlus className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
