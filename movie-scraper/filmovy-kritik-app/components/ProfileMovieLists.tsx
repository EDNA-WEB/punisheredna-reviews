'use client';

import { useState } from 'react';
import MovieListCard from './MovieListCard';

type Movie = { slug: string; title: string; poster: string | null; year: string | null };
type ListT = { id: string; title: string; itemCount: number; items: Movie[] };

export default function ProfileMovieLists({ lists: initialLists, isOwn }: { lists: ListT[]; isOwn: boolean }) {
  const [lists, setLists] = useState(initialLists);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function createList() {
    if (!title.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/movie-lists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim() })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Vytvorenie zlyhalo.');
      setLists((prev) => [{ id: data.id, title: data.title, itemCount: 0, items: [] }, ...prev]);
      setTitle('');
      setCreating(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {isOwn && (
        <div>
          {!creating ? (
            <button onClick={() => setCreating(true)} className="bg-accent text-white px-4 py-2 rounded-full text-sm font-semibold hover:bg-accent-dark">
              + Nový zoznam
            </button>
          ) : (
            <div className="flex items-center gap-2 max-w-sm">
              <input
                className="field-input-sm"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="napr. Najlepšie filmy roku 2026"
                maxLength={120}
                autoFocus
              />
              <button onClick={createList} disabled={loading} className="bg-accent text-white text-xs font-semibold px-4 py-2 rounded-full hover:bg-accent-dark disabled:opacity-50 flex-none">
                {loading ? '…' : 'Vytvoriť'}
              </button>
              <button onClick={() => setCreating(false)} className="text-xs text-muted hover:text-ink flex-none">Zrušiť</button>
            </div>
          )}
          {error && <div className="text-danger text-xs mt-1.5">{error}</div>}
        </div>
      )}

      {lists.length === 0 ? (
        <p className="text-sm text-muted">Zatiaľ žiadne zoznamy.</p>
      ) : (
        <div className="space-y-4">
          {lists.map((l) => (
            <MovieListCard key={l.id} id={l.id} title={l.title} itemCount={l.itemCount} items={l.items} />
          ))}
        </div>
      )}
    </div>
  );
}
