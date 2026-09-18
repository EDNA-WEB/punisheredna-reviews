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
    <>
      {/* Šípka — samostatný, vždy pevne prilepený prvok na pravom okraji.
          Panel sa vysúva SPOZA nej, nezávisle, žiadne vnorené flex/width
          triky, čo sa dali ľahko pokaziť. */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? 'Skryť štatistiky webu' : 'Zobraziť štatistiky webu'}
        className="hidden xl:flex fixed right-0 top-1/2 -translate-y-1/2 z-20 w-7 h-16 items-center justify-center rounded-l-xl border border-r-0 border-line bg-card shadow-lg hover:bg-surface transition-colors"
      >
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          className={`text-accent transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
        >
          <path d="M15 6l-6 6 6 6" />
        </svg>
      </button>

      {/* Panel — keď je zatvorený, je posunutý celý mimo obrazovky vpravo
          (translate-x-full = o celú svoju vlastnú šírku), takže naozaj nie
          je vidno vôbec nič, kým sa nerozvinie. */}
      <div
        className={`hidden xl:block fixed right-7 top-1/2 -translate-y-1/2 z-10 w-60 transition-transform duration-300 ease-out ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="bg-card border border-line rounded-l-2xl shadow-xl px-5 py-5">
          <div className="text-[11px] font-bold uppercase tracking-widest text-accent mb-4">Na webe máme</div>

          <div className="mb-5">
            <div className="font-display font-extrabold text-4xl text-ink leading-none tabular-nums">{czechCount.toLocaleString('sk-SK')}</div>
            <div className="text-sm text-muted mt-1.5 leading-snug">profilov filmov<br />v češtine</div>
          </div>

          <div className="mb-1">
            <div className="font-display font-extrabold text-4xl text-ink leading-none tabular-nums">{onlineCount.toLocaleString('sk-SK')}</div>
            <div className="text-sm text-muted mt-1.5 leading-snug">filmov a seriálov<br />dostupných online</div>
          </div>

          <div className="text-xs text-muted mt-4 pt-4 border-t border-line">
            z celkovo <span className="font-semibold text-ink">{totalMovies.toLocaleString('sk-SK')}</span> titulov
          </div>
        </div>
      </div>
    </>
  );
}
