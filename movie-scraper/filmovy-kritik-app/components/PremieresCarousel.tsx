'use client';

import { useRef, useEffect, useState } from 'react';
import Link from 'next/link';
import CountdownBadge from './CountdownBadge';
import { IconChevronLeft, IconChevronRight } from './Icons';

type PremiereItem = {
  id: string;
  releaseDate: Date | string;
  movie: { title: string; slug: string; poster: string | null };
};

const PIXELS_PER_SECOND = 35;
const END_PAUSE_MS = 5000;
const STEP = 260;

// Namiesto natívneho posúvania prehliadača (scrollLeft) — to sa v praxi
// ukázalo nespoľahlivé naprieč prehliadačmi — riadime polohu úplne sami cez
// CSS "transform: translateX()" na vnútornom páse. Vlastný pás vieme
// spoľahlivo animovať aj ťahať myšou/prstom, bez toho, aby nám do toho
// vstupovala natívna logika prehliadača.
export default function PremieresCarousel({ premieres }: { premieres: PremiereItem[] }) {
  const outerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const offsetRef = useRef(0);
  const maxOffsetRef = useRef(0);
  const directionRef = useRef<1 | -1>(1);
  const pausedUntilRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);
  const hoveredRef = useRef(false);
  const draggingRef = useRef(false);
  const dragStartXRef = useRef(0);
  const dragStartOffsetRef = useRef(0);
  const [, forceRerenderOnMount] = useState(0);

  function applyOffset(next: number) {
    const clamped = Math.max(0, Math.min(maxOffsetRef.current, next));
    offsetRef.current = clamped;
    if (trackRef.current) trackRef.current.style.transform = `translateX(-${clamped}px)`;
  }

  function recalcMaxOffset() {
    if (!outerRef.current || !trackRef.current) return;
    maxOffsetRef.current = Math.max(0, trackRef.current.scrollWidth - outerRef.current.clientWidth);
  }

  useEffect(() => {
    recalcMaxOffset();
    forceRerenderOnMount((v) => v + 1);
    const onResize = () => recalcMaxOffset();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [premieres]);

  // Plynulý, nepretržitý automatický pohyb — hompáľe sa medzi začiatkom a
  // koncom, s 5-sekundovou pauzou na oboch krajoch. Ručné ťahanie (nižšie)
  // má vždy prednosť — kým používateľ ťahá alebo má myš nad karuselom,
  // automatika sa nehýbe.
  useEffect(() => {
    let frameId: number;

    function tick(now: number) {
      frameId = requestAnimationFrame(tick);
      if (hoveredRef.current || draggingRef.current || maxOffsetRef.current <= 0) {
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

      const next = offsetRef.current + directionRef.current * PIXELS_PER_SECOND * delta;
      applyOffset(next);

      const atEnd = offsetRef.current >= maxOffsetRef.current - 0.5;
      const atStart = offsetRef.current <= 0.5;
      if (atEnd || atStart) {
        pausedUntilRef.current = now + END_PAUSE_MS;
        directionRef.current = atEnd ? -1 : 1;
      }
    }

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, []);

  function onPointerDown(e: React.PointerEvent) {
    draggingRef.current = true;
    dragStartXRef.current = e.clientX;
    dragStartOffsetRef.current = offsetRef.current;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!draggingRef.current) return;
    applyOffset(dragStartOffsetRef.current - (e.clientX - dragStartXRef.current));
  }
  function onPointerUp() {
    draggingRef.current = false;
  }

  function scrollByAmount(dir: 1 | -1) {
    applyOffset(offsetRef.current + dir * STEP);
  }

  return (
    <div
      ref={outerRef}
      className="relative group/carousel overflow-hidden select-none"
      onMouseEnter={() => (hoveredRef.current = true)}
      onMouseLeave={() => (hoveredRef.current = false)}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
      style={{ touchAction: 'pan-y' }}
    >
      <div ref={trackRef} className="flex gap-3 p-4 pt-5 w-max" style={{ transform: 'translateX(0px)', willChange: 'transform' }}>
        {premieres.map((p) => (
          <Link key={p.id} href={`/movie/${p.movie.slug}`} draggable={false} className="group relative flex-none w-28">
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
