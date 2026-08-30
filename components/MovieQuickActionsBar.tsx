'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { IconEdit, IconBookmark, IconHeartOutline, IconList, IconLayers } from './Icons';

const MORE_ITEMS = [
  'Přidat obsah',
  'Přidat zajímavost',
  'Přidat obrázky',
  'Přidat podobné filmy',
  'Přidat související filmy',
  'Přidat externí recenzi',
  'Přidat tagy',
  'Přidat web'
];

export default function MovieQuickActionsBar({
  movieId,
  movieSlug,
  myReviewId,
  initialInWatchlist,
  initialInFavorites,
  isLoggedIn
}: {
  movieId: string;
  movieSlug: string;
  myReviewId: string | null;
  initialInWatchlist: boolean;
  initialInFavorites: boolean;
  isLoggedIn: boolean;
}) {
  const router = useRouter();
  const [moreOpen, setMoreOpen] = useState(false);
  const [inWatchlist, setInWatchlist] = useState(initialInWatchlist);
  const [inFavorites, setInFavorites] = useState(initialInFavorites);
  const [savingWatchlist, setSavingWatchlist] = useState(false);
  const [savingFavorites, setSavingFavorites] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!moreOpen) return;
    function onClickOutside(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setMoreOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [moreOpen]);

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

  const editReviewHref = myReviewId ? `/movie/${movieSlug}/upravit/${myReviewId}` : `/movie/${movieSlug}/napisat`;

  const primaryButtonClass =
    'flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-full bg-accent text-white hover:bg-accent-dark transition-colors flex-none whitespace-nowrap';
  const secondaryButtonClass =
    'flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-full border transition-colors flex-none whitespace-nowrap disabled:opacity-50';

  const watchlistButton = (
    <button onClick={toggleWatchlist} disabled={savingWatchlist} className={`${secondaryButtonClass} ${inWatchlist ? 'bg-night text-white border-night' : 'border-line text-ink hover:bg-surface'}`}>
      <IconBookmark className={inWatchlist ? 'w-3.5 h-3.5' : 'w-3.5 h-3.5 text-blue-500'} filled={inWatchlist} />
      {inWatchlist ? 'Vo videných' : 'Chci vidět'}
    </button>
  );

  const favoritesButton = (
    <button onClick={toggleFavorites} disabled={savingFavorites} className={`${secondaryButtonClass} ${inFavorites ? 'bg-rose-500 text-white border-rose-500' : 'border-line text-ink hover:bg-surface'}`}>
      <IconHeartOutline className={inFavorites ? 'w-3.5 h-3.5' : 'w-3.5 h-3.5 text-rose-500'} />
      {inFavorites ? 'V oblíbených' : 'Oblíbené'}
    </button>
  );

  return (
    <div className="flex items-stretch gap-2 pt-4 mt-4 border-t border-line">
      <div className="flex items-center gap-2 overflow-x-auto min-w-0">
        <Link href={editReviewHref} className={primaryButtonClass}>
          <IconEdit className="w-3.5 h-3.5" />
          {myReviewId ? 'Upravit recenzi' : 'Napsat recenzi'}
        </Link>

        <span className="hidden sm:contents">
          {watchlistButton}
          {favoritesButton}
        </span>
        <button className={`${secondaryButtonClass} hidden sm:flex border-line text-ink hover:bg-surface`}>
          <IconList className="w-3.5 h-3.5 text-amber-500" />
          Seznamy
        </button>
        <button className={`${secondaryButtonClass} hidden sm:flex border-line text-ink hover:bg-surface`}>
          <IconLayers className="w-3.5 h-3.5 text-emerald-500" />
          Filmotéka
        </button>

        <span className="sm:hidden contents">
          {watchlistButton}
          {favoritesButton}
        </span>
      </div>

      <div className="relative flex-none" ref={boxRef}>
        <button
          onClick={() => setMoreOpen((o) => !o)}
          className="flex items-center justify-center w-8 h-8 rounded-full border border-line text-ink hover:bg-surface transition-colors flex-none"
          aria-label="Ďalšie možnosti"
        >
          •••
        </button>
        {moreOpen && (
          <div className="absolute right-0 top-full mt-1 w-56 rounded-xl border border-line bg-card shadow-lg overflow-hidden z-20 max-h-80 overflow-y-auto">
            <button onClick={() => setMoreOpen(false)} className="w-full text-left px-4 py-2.5 text-sm text-ink hover:bg-surface sm:hidden">
              Seznamy
            </button>
            <button onClick={() => setMoreOpen(false)} className="w-full text-left px-4 py-2.5 text-sm text-ink hover:bg-surface sm:hidden">
              Filmotéka
            </button>
            {MORE_ITEMS.map((label) => (
              <button
                key={label}
                onClick={() => setMoreOpen(false)}
                className="w-full text-left px-4 py-2.5 text-sm text-ink hover:bg-surface"
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
