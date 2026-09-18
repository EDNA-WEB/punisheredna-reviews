'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function FetchTmdbPopularityButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState('');

  async function run() {
    setLoading(true);
    setResult('');
    try {
      const res = await fetch('/api/admin/movies/bulk-tmdb-popularity', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Natiahnutie zlyhalo.');
      setResult(`Hotovo — natiahnuté ${data.updated} z ${data.total} (${data.failed} zlyhalo).`);
      router.refresh();
    } catch (err: any) {
      setResult(err.message || 'Natiahnutie zlyhalo.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-2 mb-4">
      <button
        type="button"
        onClick={run}
        disabled={loading}
        className="text-xs font-semibold text-accent hover:underline disabled:opacity-50"
      >
        {loading ? 'Naťahujem z TMDb… (môže to chvíľu trvať)' : '⭐ Natiahnuť popularitu a hodnotenie z TMDb'}
      </button>
      {result && <span className="text-xs text-muted">{result}</span>}
    </div>
  );
}
