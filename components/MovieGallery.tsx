'use client';

import { useState } from 'react';

type Photo = { id: string; thumbnail: string };

export default function MovieGallery({ movieId, photos, noHeading }: { movieId: string; photos: Photo[]; noHeading?: boolean }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [fullSrc, setFullSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (photos.length === 0) return null;

  async function openPhoto(i: number) {
    setOpenIndex(i);
    setFullSrc(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/movies/${movieId}/photos/${photos[i].id}`);
      const data = await res.json();
      setFullSrc(data.full);
    } finally {
      setLoading(false);
    }
  }

  function step(delta: number) {
    if (openIndex === null) return;
    const next = (openIndex + delta + photos.length) % photos.length;
    openPhoto(next);
  }

  return (
    <div className="mb-8">
      {!noHeading && <h2 className="font-display font-bold text-lg text-ink mb-3">Fotogaléria</h2>}
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
        {photos.map((p, i) => (
          <button
            key={p.id}
            onClick={() => openPhoto(i)}
            className="aspect-square rounded-lg overflow-hidden bg-surface hover:opacity-90 transition-opacity"
          >
            <img src={p.thumbnail} alt="" loading="lazy" className="w-full h-full object-cover" />
          </button>
        ))}
      </div>

      {openIndex !== null && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-night/70" onClick={() => setOpenIndex(null)} />

          <button
            onClick={() => setOpenIndex(null)}
            aria-label="Zavrieť"
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center text-2xl leading-none z-10 hover:bg-white/20"
          >
            ×
          </button>

          {photos.length > 1 && (
            <>
              <button
                onClick={() => step(-1)}
                aria-label="Predchádzajúca"
                className="absolute left-2 sm:left-4 w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center text-xl z-10 hover:bg-white/20"
              >
                ‹
              </button>
              <button
                onClick={() => step(1)}
                aria-label="Ďalšia"
                className="absolute right-2 sm:right-4 w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center text-xl z-10 hover:bg-white/20"
              >
                ›
              </button>
            </>
          )}

          <div className="relative max-w-3xl max-h-[85vh] w-full flex items-center justify-center">
            {loading || !fullSrc ? (
              <div className="w-10 h-10 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={fullSrc} alt="" className="max-w-full max-h-[85vh] rounded-lg object-contain" />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
