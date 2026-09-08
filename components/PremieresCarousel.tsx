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

const PIXELS_PER_SECOND = 40; // rýchlosť plynulého posunu
const END_PAUSE_MS = 5000;

export default function PremieresCarousel({ premieres }: { premieres: PremiereItem[] }) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const hoveredRef = useRef(false);
  const directionRef = useRef<1 | -1>(1);
  const pausedUntilRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);

  function scrollByAmount(dir: 1 | -1) {
    scrollerRef.current?.scrollBy({ left: dir * 260, behavior: 'smooth' });
  }

  // Plynulý, nepretržitý pohyb karuselu (cez requestAnimationFrame — nie skoky
  // po pár sekundách, aby to nepôsobilo trhane). Keď dôjde na koniec, na 5
  // sekúnd sa zastaví a potom sa vydá opačným smerom naspäť — a to isté sa
  // zopakuje aj po návrate na začiatok, takže sa to plynule "hompáľe" tam a
  // späť, nikdy neskáče naraz na začiatok. Ručné posúvanie naďalej funguje.
  useEffect(() => {
    let frameId: number;

    function tick(now: number) {
      frameId = requestAnimationFrame(tick);
      const el = scrollerRef.current;
      if (!el || hoveredRef.current) {
        lastTimeRef.current = now;
        return;
      }

      if (pausedUntilRef.current !== null) {
        if (now < pausedUntilRef.current) {
          lastTimeRef.current = now;
          return;
        }
        pausedUntilRef.current = null;
      }

      const delta = lastTimeRef.current === null ? 0 : (now - lastTimeRef.current) / 1000;
      lastTimeRef.current = now;

      const maxScroll = el.scrollWidth - el.clientWidth;
      el.scrollLeft += directionRef.current * PIXELS_PER_SECOND * delta;

      const atEnd = el.scrollLeft >= maxScroll - 1;
      const atStart = el.scrollLeft <= 1;

      if (atEnd || atStart) {
        el.scrollLeft = atEnd ? maxScroll : 0;
        directionRef.current = atEnd ? -1 : 1;
        pausedUntilRef.current = now + END_PAUSE_MS;
      }
    }

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, []);

  return (
    <div
      className="relative group/carousel"
      onMouseEnter={() => (hoveredRef.current = true)}
      onMouseLeave={() => (hoveredRef.current = false)}
    >
      <div ref={scrollerRef} className="flex gap-3 overflow-x-auto p-4 pt-5 snap-x">
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
