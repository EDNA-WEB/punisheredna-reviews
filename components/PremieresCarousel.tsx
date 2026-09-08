'use client';

import { useRef, useEffect } from 'react';
import Link from 'next/link';
import CountdownBadge from './CountdownBadge';
import { IconChevronLeft, IconChevronRight } from './Icons';

type PremiereItem = {
  id: string;
  releaseDate: Date | string;
  movie: { title: string; slug: string; poster: string | null };
};

const SCROLL_STEP = 260;
const TICK_MS = 3000;
const END_PAUSE_MS = 10000;

export default function PremieresCarousel({ premieres }: { premieres: PremiereItem[] }) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const pausedUntilRef = useRef<number | null>(null);
  const hoveredRef = useRef(false);

  function scrollByAmount(dir: 1 | -1) {
    scrollerRef.current?.scrollBy({ left: dir * SCROLL_STEP, behavior: 'smooth' });
  }

  // Automatický, plynulý pohyb karuselu — každé 3 sekundy sa posunie kúsok
  // dopredu; keď dôjde na koniec, počká 10 sekúnd a vráti sa na začiatok, potom
  // cyklus opakuje. Ručné posúvanie (myšou/dotykom/šípkami) naďalej funguje
  // normálne — automatika ho nijako neprepisuje ani nezastavuje natrvalo.
  useEffect(() => {
    const interval = setInterval(() => {
      const el = scrollerRef.current;
      if (!el || hoveredRef.current) return;

      const isAtEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 4;

      if (isAtEnd) {
        if (pausedUntilRef.current === null) {
          // Práve sme dorazili na koniec — spusti 10-sekundové čakanie.
          pausedUntilRef.current = Date.now() + END_PAUSE_MS;
        } else if (Date.now() >= pausedUntilRef.current) {
          // Čakanie uplynulo — vráť sa plynule na začiatok a začni znova.
          el.scrollTo({ left: 0, behavior: 'smooth' });
          pausedUntilRef.current = null;
        }
      } else {
        el.scrollBy({ left: SCROLL_STEP, behavior: 'smooth' });
      }
    }, TICK_MS);

    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className="relative group/carousel"
      onMouseEnter={() => (hoveredRef.current = true)}
      onMouseLeave={() => (hoveredRef.current = false)}
    >
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
              <div className="absolute top-2 left-2">
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
