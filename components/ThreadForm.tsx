'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

type MovieOption = { id: string; title: string; year: string | null };

export default function ThreadForm() {
  const router = useRouter();
  const [movies, setMovies] = useState<MovieOption[]>([]);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [movieId, setMovieId] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('/api/movies').then((r) => r.json()).then(setMovies).catch(() => {});
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !body.trim()) {
      setError('Vyplň názov aj text témy.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/threads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, body, movieId: movieId || null })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Založenie témy zlyhalo.');
      router.push(`/diskusie/${data.id}`);
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="max-w-xl space-y-5">
      <div>
        <label className="block text-sm font-semibold text-ink mb-2">Názov témy</label>
        <input className="field-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="O čom chceš diskutovať?" />
      </div>
      <div>
        <label className="block text-sm font-semibold text-ink mb-2">Týka sa filmu (nepovinné)</label>
        <select className="field-input" value={movieId} onChange={(e) => setMovieId(e.target.value)}>
          <option value="">— Všeobecná téma —</option>
          {movies.map((m) => (
            <option key={m.id} value={m.id}>{m.title}{m.year ? ` (${m.year})` : ''}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-semibold text-ink mb-2">Text</label>
        <textarea className="field-input min-h-[160px]" value={body} onChange={(e) => setBody(e.target.value)} placeholder="Napíš svoj príspevok…" />
      </div>
      {error && <div className="text-danger text-sm">{error}</div>}
      <div className="flex gap-3">
        <button type="submit" disabled={loading} className="bg-accent text-white px-6 py-3 rounded-full text-sm font-semibold hover:bg-accent-dark disabled:opacity-50">
          {loading ? 'Zakladám…' : 'Založiť tému'}
        </button>
        <button type="button" onClick={() => router.back()} className="border border-line text-muted px-6 py-3 rounded-full text-sm font-semibold hover:text-ink hover:border-ink">
          Zrušiť
        </button>
      </div>
    </form>
  );
}
