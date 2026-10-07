'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import CountdownBadge from './CountdownBadge';
import { IconChevronLeft, IconChevronRight } from './Icons';

type PremiereItem = {
  id: string;
  releaseDate: Date | string;
  movie: { title: string; slug: string; poster: string | null };
};

const GAP = 12;
const PAD = 16;
const MIN_W = 96;
const MAX_W = 132;
const AUTO_MS = 5000;

// V kinech brzy — hlavička s nadpisom a šípkami, pod ňou rad plagátov.
// Plagáty majú vždy celú šírku (žiadny odrezaný plagát na kraji): šírka sa
// dopočíta podľa miesta, aby sa zmestil celý počet. Posúva sa po jednom
// plagáte — šípkami, potiahnutím alebo samo každých 5 s (pri myši nad
// karuselom stojí).
export default function PremieresCarousel({ premieres, title }: { premieres: PremiereItem[]; title?: string }) {
  const outerRef = useRef<HTMLDivElement>(null);
  const [itemW, setItemW] = useState(112);
  const [perView, setPerView] = useState(3);
  const [index, setIndex] = useState(0);
  const [drag, setDrag] = useState<number | null>(null);
  const dragStart = useRef(0);
  const hovered = useRef(false);
  const dir = useRef<1 | -1>(1);
  const movedRef = useRef(false);

  const maxIndex = Math.max(0, premieres.length - perView);

  const measure = useCallback(() => {
    const w = outerRef.current?.clientWidth || 0;
    if (!w) return;
    const inner = w - PAD * 2;
    let n = Math.max(1, Math.floor((inner + GAP) / (MAX_W + GAP)));
    let size = (inner - GAP * (n - 1)) / n;
    while (size < MIN_W && n > 1) {
      n -= 1;
      size = (inner - GAP * (n - 1)) / n;
    }
    // Aspoň 3 plagáty vedľa seba, ak sa zmestia v minimálnej šírke.
    if (n < 3 && (inner - GAP * 2) / 3 >= MIN_W) {
      n = 3;
      size = (inner - GAP * 2) / 3;
    }
    setPerView(n);
    setItemW(Math.floor(size));
  }, []);

  useEffect(() => {
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [measure]);

  useEffect(() => {
    setIndex((i) => Math.min(i, maxIndex));
  }, [maxIndex]);

  useEffect(() => {
    if (maxIndex === 0) return;
    const id = setInterval(() => {
      if (hovered.current || drag !== null) return;
      setIndex((i) => {
        if (i >= maxIndex) dir.current = -1;
        else if (i <= 0) dir.current = 1;
        return Math.max(0, Math.min(maxIndex, i + dir.current));
      });
    }, AUTO_MS);
    return () => clearInterval(id);
  }, [maxIndex, drag]);

  const go = (d: 1 | -1) => setIndex((i) => Math.max(0, Math.min(maxIndex, i + d)));
  const step = itemW + GAP;
  const offset = index * step - (drag ?? 0);

  function onPointerDown(e: React.PointerEvent) {
    dragStart.current = e.clientX;
    movedRef.current = false;
    setDrag(0);
  }
  function onPointerMove(e: React.PointerEvent) {
    if (drag === null) return;
    const dx = e.clientX - dragStart.current;
    if (Math.abs(dx) > 6) movedRef.current = true;
    setDrag(dx);
  }
  function onPointerUp() {
    if (drag === null) return;
    const moved = Math.round(-drag / step);
    setIndex((i) => Math.max(0, Math.min(maxIndex, i + moved)));
    setDrag(null);
  }

  const arrow = 'w-8 h-8 rounded-full border border-line bg-card text-ink flex items-center justify-center hover:border-accent disabled:opacity-40 disabled:hover:border-line';

  return (
    <div onMouseEnter={() => (hovered.current = true)} onMouseLeave={() => (hovered.current = false)}>
      {title && (
        <div className="flex items-center justify-between px-4 pt-3.5">
          <h2 className="font-display font-bold text-base text-ink">{title}</h2>
          {maxIndex > 0 && (
            <div className="flex gap-2">
              <button type="button" onClick={() => go(-1)} disabled={index === 0} aria-label="Posunout doleva" className={arrow}>
                <IconChevronLeft className="w-4 h-4" />
              </button>
              <button type="button" onClick={() => go(1)} disabled={index >= maxIndex} aria-label="Posunout doprava" className={arrow}>
                <IconChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}
      <div
        ref={outerRef}
        className="relative overflow-hidden select-none"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
        style={{ touchAction: 'pan-y' }}
      >
        <div
          className="flex w-max"
          style={{
            gap: GAP,
            padding: `12px ${PAD}px ${PAD}px`,
            transform: `translateX(-${Math.max(0, offset)}px)`,
            transition: drag === null ? 'transform .45s cubic-bezier(.2,.7,.2,1)' : 'none'
          }}
        >
          {premieres.map((p) => (
            <Link key={p.id} href={`/movie/${p.movie.slug}`} draggable={false} onClickCapture={(e) => movedRef.current && e.preventDefault()} className="group relative flex-none" style={{ width: itemW }}>
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
      </div>
    </div>
  );
}
