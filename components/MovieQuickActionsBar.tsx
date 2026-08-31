'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { IconEdit, IconBookmark, IconHeartOutline, IconList, IconLayers } from './Icons';
import AddContentModal from './AddContentModal';
import AddTriviaModal from './AddTriviaModal';
import AddImagesModal from './AddImagesModal';
import AddPodobneFilmyModal from './AddPodobneFilmyModal';
import AddSuvisiaceFilmyModal from './AddSuvisiaceFilmyModal';
import AddExternalReviewModal from './AddExternalReviewModal';
import AddTagsModal from './AddTagsModal';
import AddWebModal from './AddWebModal';
import EditReviewModal from './EditReviewModal';

const MORE_ITEMS: { key: string; label: string }[] = [
  { key: 'content', label: 'Přidat obsah' },
  { key: 'trivia', label: 'Přidat zajímavost' },
  { key: 'images', label: 'Přidat obrázky' },
  { key: 'similar', label: 'Přidat podobné filmy' },
  { key: 'related', label: 'Přidat související filmy' },
  { key: 'external', label: 'Přidat externí recenzi' },
  { key: 'tags', label: 'Přidat tagy' },
  { key: 'web', label: 'Přidat web' }
];

export default function MovieQuickActionsBar({
  movieId,
  movieSlug,
  movieTitle,
  movieYear,
  myReviewId,
  myReviewBody,
  myReviewRating,
  initialInWatchlist,
  initialInFavorites,
  isLoggedIn
}: {
  movieId: string;
  movieSlug: string;
  movieTitle: string;
  movieYear: string | null;
  myReviewId: string | null;
  myReviewBody: string;
  myReviewRating: number;
  initialInWatchlist: boolean;
  initialInFavorites: boolean;
  isLoggedIn: boolean;
}) {
  const router = useRouter();
  const [moreOpen, setMoreOpen] = useState(false);
  const [addContentOpen, setAddContentOpen] = useState<string | null>(null);
  const [editReviewOpen, setEditReviewOpen] = useState(false);
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


  const primaryButtonClass =
    'flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-full bg-accent text-white hover:bg-accent-dark transition-colors flex-none whitespace-nowrap';
  const secondaryButtonClass =
    'flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-full border transition-colors flex-none whitespace-nowrap disabled:opacity-50';

  const watchlistButton = (
    <button onClick={toggleWatchlist} disabled={savingWatchlist} className={`${secondaryButtonClass} ${inWatchlist ? 'bg-blue-600 text-white border-blue-600' : 'border-line text-ink hover:bg-surface'}`}>
      <IconBookmark className={'w-3.5 h-3.5'} filled={inWatchlist} />
      {inWatchlist ? 'Vo videných' : 'Chci vidět'}
    </button>
  );

  const favoritesButton = (
    <button onClick={toggleFavorites} disabled={savingFavorites} className={`${secondaryButtonClass} ${inFavorites ? 'bg-blue-600 text-white border-blue-600' : 'border-line text-ink hover:bg-surface'}`}>
      <IconHeartOutline className={'w-3.5 h-3.5'} />
      {inFavorites ? 'V oblíbených' : 'Oblíbené'}
    </button>
  );

  return (
    <div className="flex items-stretch gap-2 pt-4 mt-4 border-t border-line">
      <div className="flex items-center gap-2 overflow-x-auto min-w-0">
        <button onClick={() => (isLoggedIn ? setEditReviewOpen(true) : router.push('/login'))} className={primaryButtonClass}>
          <IconEdit className="w-3.5 h-3.5" />
          {myReviewId ? 'Upravit recenzi' : 'Napsat recenzi'}
        </button>

        <span className="hidden sm:contents">
          {watchlistButton}
          {favoritesButton}
        </span>
        <button className={`${secondaryButtonClass} hidden sm:flex border-line text-ink hover:bg-surface`}>
          <IconList className="w-3.5 h-3.5" />
          Seznamy
        </button>
        <button className={`${secondaryButtonClass} hidden sm:flex border-line text-ink hover:bg-surface`}>
          <IconLayers className="w-3.5 h-3.5" />
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
            {MORE_ITEMS.map((item) => (
              <button
                key={item.key}
                onClick={() => {
                  setMoreOpen(false);
                  setAddContentOpen(item.key);
                }}
                className="w-full text-left px-4 py-2.5 text-sm text-ink hover:bg-surface"
              >
                {item.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {addContentOpen === 'content' && (
        <AddContentModal movieId={movieId} movieTitle={movieTitle} movieYear={movieYear} onClose={() => setAddContentOpen(null)} />
      )}
      {addContentOpen === 'trivia' && (
        <AddTriviaModal movieId={movieId} movieTitle={movieTitle} movieYear={movieYear} onClose={() => setAddContentOpen(null)} />
      )}
      {addContentOpen === 'images' && (
        <AddImagesModal movieId={movieId} movieTitle={movieTitle} movieYear={movieYear} onClose={() => setAddContentOpen(null)} />
      )}
      {addContentOpen === 'similar' && (
        <AddPodobneFilmyModal movieId={movieId} movieTitle={movieTitle} movieYear={movieYear} onClose={() => setAddContentOpen(null)} />
      )}
      {addContentOpen === 'related' && (
        <AddSuvisiaceFilmyModal movieId={movieId} movieTitle={movieTitle} movieYear={movieYear} onClose={() => setAddContentOpen(null)} />
      )}
      {addContentOpen === 'external' && (
        <AddExternalReviewModal movieId={movieId} movieTitle={movieTitle} movieYear={movieYear} onClose={() => setAddContentOpen(null)} />
      )}
      {addContentOpen === 'tags' && (
        <AddTagsModal movieId={movieId} movieTitle={movieTitle} movieYear={movieYear} onClose={() => setAddContentOpen(null)} />
      )}
      {addContentOpen === 'web' && (
        <AddWebModal movieId={movieId} movieTitle={movieTitle} movieYear={movieYear} onClose={() => setAddContentOpen(null)} />
      )}
      {editReviewOpen && (
        <EditReviewModal
          movieId={movieId}
          movieTitle={movieTitle}
          reviewId={myReviewId}
          initialBody={myReviewBody}
          initialRating={myReviewRating}
          onClose={() => setEditReviewOpen(false)}
        />
      )}
    </div>
  );
}
