'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { IconEdit, IconBookmark, IconHeartOutline } from './Icons';
import EditReviewModal from './EditReviewModal';

export default function SeasonEpisodeQuickActionsBar({
  reviewApiBase,
  reviewTitle,
  myReviewId,
  myReviewBody,
  myReviewRating,
  movieId,
  initialInWatchlist,
  initialInFavorites,
  isLoggedIn
}: {
  reviewApiBase: string;
  reviewTitle: string;
  myReviewId: string | null;
  myReviewBody: string;
  myReviewRating: number;
  movieId: string;
  initialInWatchlist: boolean;
  initialInFavorites: boolean;
  isLoggedIn: boolean;
}) {
  const router = useRouter();
  const [editReviewOpen, setEditReviewOpen] = useState(false);
  const [inWatchlist, setInWatchlist] = useState(initialInWatchlist);
  const [inFavorites, setInFavorites] = useState(initialInFavorites);
  const [savingWatchlist, setSavingWatchlist] = useState(false);
  const [savingFavorites, setSavingFavorites] = useState(false);

  async function toggleWatchlist() {
    if (!isLoggedIn) return router.push('/login');
    setSavingWatchlist(true);
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
      setSavingWatchlist(false);
    }
  }

  async function toggleFavorites() {
    if (!isLoggedIn) return router.push('/login');
    setSavingFavorites(true);
    try {
      const res = await fetch('/api/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ movieId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error();
      setInFavorites(data.inFavorites);
      router.refresh();
    } catch {
      alert('Akcia zlyhala. Skús to prosím znova.');
    } finally {
      setSavingFavorites(false);
    }
  }

  const primaryButtonClass =
    'flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-full bg-accent text-white hover:bg-accent-dark transition-colors flex-none whitespace-nowrap';
  const secondaryButtonClass =
    'flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-full border transition-colors flex-none whitespace-nowrap disabled:opacity-50';

  return (
    <div className="flex items-center gap-2 pt-4 mt-4 border-t border-line overflow-x-auto">
      <button onClick={() => (isLoggedIn ? setEditReviewOpen(true) : router.push('/login'))} className={primaryButtonClass}>
        <IconEdit className="w-3.5 h-3.5" />
        {myReviewId ? 'Upravit recenzi' : 'Napsat recenzi'}
      </button>

      <button onClick={toggleWatchlist} disabled={savingWatchlist} className={`${secondaryButtonClass} ${inWatchlist ? 'bg-blue-600 text-white border-blue-600' : 'border-line text-ink hover:bg-surface'}`}>
        <IconBookmark className="w-3.5 h-3.5" filled={inWatchlist} />
        {inWatchlist ? 'Vo videných' : 'Chci vidět'}
      </button>
      <button onClick={toggleFavorites} disabled={savingFavorites} className={`${secondaryButtonClass} ${inFavorites ? 'bg-blue-600 text-white border-blue-600' : 'border-line text-ink hover:bg-surface'}`}>
        <IconHeartOutline className="w-3.5 h-3.5" />
        {inFavorites ? 'V oblíbených' : 'Oblíbené'}
      </button>

      {editReviewOpen && (
        <EditReviewModal
          apiBase={reviewApiBase}
          title={reviewTitle}
          reviewId={myReviewId}
          initialBody={myReviewBody}
          initialRating={myReviewRating}
          onClose={() => setEditReviewOpen(false)}
        />
      )}
    </div>
  );
}
