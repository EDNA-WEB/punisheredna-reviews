'use client';

import { useState } from 'react';
import Link from 'next/link';
import MovieListAddSearch from './MovieListAddSearch';
import { IconX } from './Icons';

type Item = { id: string; movie: { id: string; title: string; slug: string; poster: string | null; year: string | null } };

export default function MovieListGrid({ listId, initialItems, isOwn }: { listId: string; initialItems: Item[]; isOwn: boolean }) {
  const [items, setItems] = useState(initialItems);
  const [showAll, setShowAll] = useState(false);

  const PER_ROW = 10;
  const shown = showAll ? items : items.slice(0, PER_ROW);

  async function removeItem(itemId: string) {
    setItems((prev) => prev.filter((i) => i.id !== itemId));
    await fetch(`/api/movie-lists/${listId}/items/${itemId}`, { method: 'DELETE' }).catch(() => {});
  }

  return (
    <div>
      {isOwn && (
        <div className="mb-5 max-w-sm">
          <MovieListAddSearch
            listId={listId}
            onAdded={(movie) => setItems((prev) => [...prev, { id: `temp-${movie.id}`, movie }])}
          />
        </div>
      )}

      {items.length === 0 ? (
        <p className="text-sm text-muted">Zatiaľ žiadne filmy v zozname.</p>
      ) : (
        <>
          <div className="grid grid-cols-5 sm:grid-cols-10 gap-2.5">
            {shown.map((item) => (
              <div key={item.id} className="relative group">
                <Link href={`/movie/${item.movie.slug}`} className="block">
                  <div className="aspect-[2/3] rounded-md bg-surface bg-cover bg-center" style={item.movie.poster ? { backgroundImage: `url('${item.movie.poster}')` } : undefined} />
                  <div className="text-[11px] text-ink mt-1 truncate">{item.movie.title}</div>
                  <div className="text-[10px] text-muted">{item.movie.year}</div>
                </Link>
                {isOwn && (
                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    title="Odstrániť zo zoznamu"
                    aria-label="Odstrániť zo zoznamu"
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-night text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <IconX className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}
          </div>

          {items.length > PER_ROW && !showAll && (
            <button
              onClick={() => setShowAll(true)}
              className="mt-4 text-xs font-bold text-white bg-accent px-4 py-2 rounded-full hover:bg-accent-dark"
            >
              VIAC ({items.length - PER_ROW})
            </button>
          )}
        </>
      )}
    </div>
  );
}
