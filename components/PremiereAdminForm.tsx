'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function PremiereAdminForm() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [releaseDate, setReleaseDate] = useState('');
  const [year, setYear] = useState('');
  const [country, setCountry] = useState('');
  const [genres, setGenres] = useState('');
  const [director, setDirector] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !releaseDate) {
      setError('Vyplň aspoň názov a dátum premiéry.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/premieres', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, releaseDate, year, country, genres, director })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Uloženie zlyhalo.');
      setTitle(''); setReleaseDate(''); setYear(''); setCountry(''); setGenres(''); setDirector('');
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="max-w-lg space-y-4 border border-line rounded-xl p-5 bg-surface">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-semibold text-ink mb-1.5">Názov filmu</label>
          <input className="field-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Názov" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-ink mb-1.5">V kinách od</label>
          <input type="date" className="field-input" value={releaseDate} onChange={(e) => setReleaseDate(e.target.value)} />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-sm font-semibold text-ink mb-1.5">Rok</label>
          <input className="field-input" value={year} onChange={(e) => setYear(e.target.value)} placeholder="2026" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-ink mb-1.5">Krajina</label>
          <input className="field-input" value={country} onChange={(e) => setCountry(e.target.value)} placeholder="USA" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-ink mb-1.5">Réžia</label>
          <input className="field-input" value={director} onChange={(e) => setDirector(e.target.value)} placeholder="Meno" />
        </div>
      </div>
      <div>
        <label className="block text-sm font-semibold text-ink mb-1.5">Žánre</label>
        <input className="field-input" value={genres} onChange={(e) => setGenres(e.target.value)} placeholder="Akčný, Sci-Fi" />
      </div>
      {error && <div className="text-danger text-sm">{error}</div>}
      <button type="submit" disabled={loading} className="bg-accent text-white px-5 py-2.5 rounded-full text-sm font-semibold hover:bg-accent-dark disabled:opacity-50">
        {loading ? 'Pridávam…' : '+ Pridať premiéru'}
      </button>
    </form>
  );
}
