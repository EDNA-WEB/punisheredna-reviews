'use client';

import { useState } from 'react';
import Link from 'next/link';

type ResultItem = { name: string; status: 'added' | 'duplicate' | 'not_found' | 'error'; slug?: string; existingSlug?: string };

const MAX_NAMES = 25;

export default function BulkAddPeopleForm() {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ResultItem[] | null>(null);
  const [error, setError] = useState('');

  const lineCount = text.split('\n').map((l) => l.trim()).filter(Boolean).length;
  const overLimit = lineCount > MAX_NAMES;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const names = text.split('\n').map((l) => l.trim()).filter(Boolean);
    if (names.length === 0) return;
    setLoading(true);
    setError('');
    setResults(null);
    try {
      const res = await fetch('/api/admin/bulk-add-people', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ names })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Požiadavka zlyhala.');
      setResults(data.results);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const statusLabel: Record<ResultItem['status'], { text: string; className: string }> = {
    added: { text: 'Pridané', className: 'text-white bg-accent' },
    duplicate: { text: 'Už existuje — preskočené', className: 'text-ink bg-surface border border-line' },
    not_found: { text: 'Na TMDb nenájdené', className: 'text-white bg-amber-500' },
    error: { text: 'Chyba', className: 'text-white bg-danger' }
  };

  return (
    <div>
      <form onSubmit={submit}>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={'Tom Hanks\nMeryl Streep\nChristopher Nolan\n…'}
          rows={10}
          className="field-input font-mono text-sm"
        />
        <div className="flex items-center justify-between mt-2 mb-4">
          <span className={`text-xs ${overLimit ? 'text-danger font-semibold' : 'text-muted'}`}>
            {lineCount} / {MAX_NAMES} mien
          </span>
        </div>
        <button
          type="submit"
          disabled={loading || lineCount === 0 || overLimit}
          className="bg-accent text-white font-semibold px-5 py-2.5 rounded-full hover:bg-accent-dark disabled:opacity-50"
        >
          {loading ? 'Spracovávam…' : 'Hromadne pridať'}
        </button>
        {error && <p className="text-danger text-sm mt-2">{error}</p>}
      </form>

      {results && (
        <div className="mt-8 space-y-2">
          <h3 className="font-display font-bold text-ink mb-3">Výsledok ({results.length})</h3>
          {results.map((r, i) => (
            <div key={i} className="flex items-center justify-between gap-3 border border-line rounded-lg px-4 py-2.5">
              <span className="text-sm font-medium text-ink">{r.name}</span>
              <div className="flex items-center gap-2 flex-none">
                <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${statusLabel[r.status].className}`}>
                  {statusLabel[r.status].text}
                </span>
                {r.status === 'added' && r.slug && (
                  <Link href={`/osobnost/${r.slug}`} className="text-xs text-accent font-semibold hover:underline">
                    Zobraziť
                  </Link>
                )}
                {r.status === 'duplicate' && r.existingSlug && (
                  <Link href={`/osobnost/${r.existingSlug}`} className="text-xs text-accent font-semibold hover:underline">
                    Zobraziť existujúci
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
