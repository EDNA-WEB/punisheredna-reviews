'use client';

import { useState } from 'react';

export default function SiteStatsPanelClient({
  czechCount,
  onlineCount,
  totalMovies
}: {
  czechCount: number;
  onlineCount: number;
  totalMovies: number;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="hidden xl:flex fixed right-0 top-1/2 -translate-y-1/2 z-10 items-stretch">
      {/* Šípka — vždy viditeľná, prilepená k pravému okraju obrazovky */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? 'Skryť štatistiky webu' : 'Zobraziť štatistiky webu'}
        className="bg-card border border-line rounded-l-lg w-6 flex-none flex items-center justify-center shadow-lg hover:bg-surface transition-colors"
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          className={`text-accent transition-transform duration-300 flex-none ${open ? 'rotate-180' : ''}`}
        >
          <path d="M15 6l-6 6 6 6" />
        </svg>
      </button>

      {/* Samotný panel — šírka sa plynulo zbaľuje/rozbaľuje, obsah vo vnútri
          má pevnú šírku, nech sa počas animácie neláme text. */}
      <div className={`overflow-hidden transition-all duration-300 ease-out ${open ? 'w-48' : 'w-0'}`}>
        <div className="w-48 h-full bg-card border border-line border-l-0 p-4">
          <div className="text-[10px] font-bold uppercase tracking-wider text-accent mb-3 whitespace-nowrap">Na webe máme</div>

          <div className="mb-4">
            <div className="font-display font-extrabold text-3xl text-ink leading-none">{czechCount}</div>
            <div className="text-xs text-muted mt-1 whitespace-nowrap">profilov filmov v češtine</div>
          </div>

          <div className="mb-1">
            <div className="font-display font-extrabold text-3xl text-ink leading-none">{onlineCount}</div>
            <div className="text-xs text-muted mt-1 whitespace-nowrap">filmov a seriálov dostupných online</div>
          </div>

          <div className="text-[10px] text-muted mt-3 pt-3 border-t border-line whitespace-nowrap">z celkovo {totalMovies} titulov</div>
        </div>
      </div>
    </div>
  );
}
