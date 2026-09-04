'use client';

import { useRef } from 'react';
import Link from 'next/link';
import CountdownBadge from './CountdownBadge';
import { IconChevronLeft, IconChevronRight } from './Icons';

type PremiereItem = {
  id: string;
  releaseDate: Date | string;
  movie: { title: string; slug: string; poster: string | null };
};

export default function PremieresCarousel({ premieres }: { premieres: PremiereItem[] }) {
  const scrollerRef = useRef<HTMLDivElement>(null);

  function scrollByAmount(dir: 1 | -1) {
    scrollerRef.current?.scrollBy({ left: dir * 260, behavior: 'smooth' });
  }

  return (
    <div className="relative group/carousel">
      <div ref={scrollerRef} className="flex gap-3 overflow-x-auto p-4 pt-5 snap-x scroll-smooth">
        {premieres.map((p) => (
          <Link key={p.id} href={`/movie/${p.movie.slug}`} className="group relative flex-none w-28 snap-start">
            <div className="relative rounded-xl overflow-hidden bg-surface aspect-[2/3] shadow-sm border border-line">
              {p.movie.poster && (
                <div
                  className="absolute inset-0 bg-cover bg-center transition-transform duration-300 group-hover:scale-[1.06]"
                  style={{ backgroundImage: `url('${p.movie.poster}')` }}
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-night/90 via-night/10 to-transparent" />
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <CountdownBadge date={p.releaseDate} />
              </div>
              <div className="absolute bottom-0 left-0 right-0 p-2">
                <div className="text-[11px] font-semibold text-white leading-snug line-clamp-2">{p.movie.title}</div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Šípky na posúvanie — viditeľné len na desktope (myš/kurzor), na mobile sa ovláda dotykom/potiahnutím. */}
      <button
        type="button"
        onClick={() => scrollByAmount(-1)}
        aria-label="Posunúť doľava"
        className="hidden md:flex absolute left-1 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-night/80 text-white items-center justify-center opacity-0 group-hover/carousel:opacity-100 transition-opacity hover:bg-night"
      >
        <IconChevronLeft className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={() => scrollByAmount(1)}
        aria-label="Posunúť doprava"
        className="hidden md:flex absolute right-1 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-night/80 text-white items-center justify-center opacity-0 group-hover/carousel:opacity-100 transition-opacity hover:bg-night"
      >
        <IconChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}
