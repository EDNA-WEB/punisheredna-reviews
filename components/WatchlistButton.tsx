'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { IconBookmark } from './Icons';
import { useT } from './TranslationProvider';

export default function WatchlistButton({ movieId, initialInWatchlist }: { movieId: string; initialInWatchlist: boolean }) {
  const router = useRouter();
  const [inWatchlist, setInWatchlist] = useState(initialInWatchlist);
  const [loading, setLoading] = useState(false);
  const t = useT();

  async function toggle() {
    setLoading(true);
    try {
      const res = await fetch('/api/watchlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ movieId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error();
      setInWatchlist(data.inWatchlist);
      router.refresh();
    } catch {
      alert('Akcia zlyhala. Skús to prosím znova.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border disabled:opacity-50 ${
        inWatchlist ? 'bg-night text-white border-night' : 'text-muted border-line hover:border-ink hover:text-ink'
      }`}
    >
      <IconBookmark className="w-3.5 h-3.5" filled={inWatchlist} />
      {t('movie.chcem_vidiet')}{inWatchlist ? ' ✓' : ''}
    </button>
  );
}
