'use client';

import { useEffect, useState } from 'react';
import { IconPlay } from './Icons';

// Veľké tlačidlo „Přehrát online“ priamo na profile filmu (ako v appke).
// Po kliknutí sa otvorí okno s prehrávaním — pri seriáli výber epizódy,
// pri filme náhľad s prehrávaním, nečlenom informácia o členstve.
export default function OnlinePlayButton({
  label,
  title,
  hasDubbing,
  hasSubtitles,
  isCam,
  children
}: {
  label: string;
  title: string;
  hasDubbing: boolean;
  hasSubtitles: boolean;
  isCam: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full flex items-center gap-3 bg-accent hover:brightness-110 text-white rounded-full pl-2 pr-4 py-2 shadow-lg shadow-accent/30 transition"
      >
        <span className="w-10 h-10 rounded-full bg-white flex items-center justify-center flex-none">
          <IconPlay className="w-4 h-4 ml-0.5 text-accent" />
        </span>
        <span className="text-[15px] font-extrabold tracking-wide">{label}</span>
        <span className="flex-1" />
        {hasDubbing && <span className="text-[10px] font-extrabold border border-white/60 rounded-full px-2 py-0.5">DABING</span>}
        {hasSubtitles && <span className="text-[10px] font-extrabold border border-white/60 rounded-full px-2 py-0.5">TITULKY</span>}
        {isCam && <span className="text-[10px] font-extrabold bg-danger border border-danger rounded-full px-2 py-0.5">CAM</span>}
      </button>

      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative w-full max-w-4xl max-h-[92vh] overflow-y-auto bg-card border border-line rounded-2xl shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center gap-3 px-5 h-14 bg-card border-b border-line">
              <span className="w-8 h-8 rounded-full bg-accent flex items-center justify-center flex-none">
                <IconPlay className="w-3.5 h-3.5 ml-0.5 text-white" />
              </span>
              <span className="font-bold text-ink truncate">{title}</span>
              <button type="button" onClick={() => setOpen(false)} className="ml-auto w-9 h-9 rounded-full hover:bg-surface flex items-center justify-center text-muted hover:text-ink" aria-label="Zavřít">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-5">{children}</div>
          </div>
        </div>
      )}
    </>
  );
}
