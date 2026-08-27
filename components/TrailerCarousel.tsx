'use client';

import { useState } from 'react';
import { IconChevronLeft, IconChevronRight, IconPlay } from './Icons';
import YouTubeSubtitlePlayer from './YouTubeSubtitlePlayer';

type Trailer = {
  id: string;
  title: string;
  youtubeId: string;
  subtitles: { startTime: number; endTime: number; text: string }[];
  posterImage: string | null;
};

export default function TrailerCarousel({ trailers }: { trailers: Trailer[] }) {
  const [active, setActive] = useState(0);
  const [playing, setPlaying] = useState(false);

  if (trailers.length === 0) {
    return (
      <div className="-mx-5 sm:mx-0">
        <div className="relative rounded-none sm:rounded-xl overflow-hidden bg-surface border border-line aspect-[16/10] sm:aspect-video flex items-center justify-center">
          <p className="text-sm text-muted px-6 text-center">
            Zatiaľ žiadny trailer. Pridaj ho pri filme cez "Upraviť film" → Videá.
          </p>
        </div>
      </div>
    );
  }
  const current = trailers[active];

  function go(delta: number) {
    setPlaying(false);
    setActive((a) => (a + delta + trailers.length) % trailers.length);
  }

  return (
    <div className="-mx-5 sm:mx-0">
      <div className="relative rounded-none sm:rounded-xl overflow-hidden bg-night aspect-[16/10] sm:aspect-video">
        {playing ? (
          <YouTubeSubtitlePlayer key={current.id} videoId={current.youtubeId} subtitles={current.subtitles} title={current.title} fill />
        ) : (
          <>
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={current.posterImage ? { backgroundImage: `url('${current.posterImage}')` } : undefined}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-black/30" />

            <button
              onClick={() => {
                setPlaying(true);
                fetch('/api/trailers/view', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ trailerId: current.id })
                }).catch(() => {});
              }}
              aria-label="Prehrať trailer"
              className="absolute inset-0 flex items-center justify-center group"
            >
              <span className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white/90 flex items-center justify-center text-night group-hover:bg-white group-hover:scale-105 transition-all shadow-lg">
                <IconPlay className="w-7 h-7 sm:w-8 sm:h-8 ml-1" />
              </span>
            </button>

            <span className="absolute bottom-4 left-4 sm:bottom-5 sm:left-5 flex items-center gap-2 text-white text-xs sm:text-sm font-semibold bg-black/40 backdrop-blur-sm px-3 py-1.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-accent" />
              {current.title} · Trailer
            </span>
          </>
        )}

        {trailers.length > 1 && (
          <>
            <button
              onClick={() => go(-1)}
              aria-label="Predchádzajúci trailer"
              className="absolute left-3 sm:left-5 top-1/2 -translate-y-1/2 w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center backdrop-blur-sm transition-colors z-10"
            >
              <IconChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => go(1)}
              aria-label="Ďalší trailer"
              className="absolute right-3 sm:right-5 top-1/2 -translate-y-1/2 w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center backdrop-blur-sm transition-colors z-10"
            >
              <IconChevronRight className="w-5 h-5" />
            </button>

            <div className="absolute bottom-3 sm:bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-10">
              {trailers.map((t, i) => (
                <button
                  key={t.id}
                  onClick={() => {
                    setPlaying(false);
                    setActive(i);
                  }}
                  aria-label={`Trailer ${i + 1}`}
                  className={`h-1.5 rounded-full transition-all ${i === active ? 'w-5 bg-white' : 'w-1.5 bg-white/50 hover:bg-white/80'}`}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
