'use client';

import { useState } from 'react';
import { IconFlag, IconTrendingUp, IconTrophy, IconEye, IconTrendingDown, IconClock, IconX, IconStar } from './Icons';

type Milestone = {
  key: string;
  label: string;
  explanation: string;
  title: string;
  year: string;
  poster: string | null;
  backdropPoster: string | null;
};

const MILESTONE_STYLE: Record<string, { icon: (c: string) => React.ReactNode; color: string; bg: string }> = {
  debut: { icon: (c) => <IconFlag className={c} />, color: '#2563EB', bg: 'rgba(37,99,235,0.12)' },
  'first-combo': { icon: (c) => <IconStar className={c} />, color: '#D97706', bg: 'rgba(217,119,6,0.12)' },
  'notable-role': { icon: (c) => <IconTrendingUp className={c} />, color: '#2563EB', bg: 'rgba(37,99,235,0.12)' },
  'busiest-year': { icon: (c) => <IconClock className={c} />, color: '#7C3AED', bg: 'rgba(124,58,237,0.12)' },
  'most-voted': { icon: (c) => <IconEye className={c} />, color: '#7C3AED', bg: 'rgba(124,58,237,0.12)' },
  'best-rated': { icon: (c) => <IconTrophy className={c} />, color: '#059669', bg: 'rgba(5,150,105,0.12)' },
  'worst-rated': { icon: (c) => <IconTrendingDown className={c} />, color: '#DC2626', bg: 'rgba(220,38,38,0.12)' },
  latest: { icon: (c) => <IconClock className={c} />, color: '#EA580C', bg: 'rgba(234,88,12,0.12)' }
};

export default function CareerTimelineModal({ personName, milestones }: { personName: string; milestones: Milestone[] }) {
  const [open, setOpen] = useState(false);
  if (milestones.length === 0) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 text-sm font-semibold text-accent border border-accent/30 bg-accent/5 px-4 py-2 rounded-full hover:bg-accent/10 transition-colors"
      >
        <IconTrendingUp className="w-4 h-4" />
        Zobraziť časovú os kariéry
      </button>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-3 sm:p-6" onClick={() => setOpen(false)}>
          <div
            className="bg-card rounded-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-card border-b border-line px-5 sm:px-8 py-4 flex items-center justify-between z-10">
              <div>
                <h2 className="font-display font-extrabold text-xl sm:text-2xl text-ink">Časová os kariéry</h2>
                <p className="text-sm text-muted">{personName}</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="w-9 h-9 rounded-full flex items-center justify-center text-muted hover:text-ink hover:bg-surface transition-colors flex-none"
                aria-label="Zavrieť"
              >
                <IconX className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 sm:p-8">
              {/* Vertikálna os na mobile, horizontálna karta po karte na desktope — obe s prepojovacou čiarou */}
              <div className="relative">
                <div className="hidden sm:block absolute left-0 right-0 top-[88px] h-0.5 bg-line" />
                <div className="grid sm:grid-cols-1 gap-6 sm:gap-0">
                  <div className="sm:flex sm:items-start sm:gap-4 sm:overflow-x-auto sm:pb-4">
                    {milestones.map((m) => {
                      const style = MILESTONE_STYLE[m.key] || MILESTONE_STYLE.debut;
                      return (
                        <div key={m.key} className="sm:flex-none sm:w-56 relative mb-8 sm:mb-0">
                          <div className="flex sm:flex-col items-start sm:items-center gap-4 sm:gap-3">
                            {/* Bodka na osi + ikonka */}
                            <div className="flex-none flex flex-col items-center">
                              <div
                                className="w-11 h-11 rounded-full flex items-center justify-center border-4 border-card relative z-[1]"
                                style={{ backgroundColor: style.bg, color: style.color }}
                              >
                                {style.icon('w-5 h-5')}
                              </div>
                              <span className="text-xs font-bold text-muted mt-1.5 hidden sm:block">{m.year}</span>
                            </div>

                            <div className="flex-1 sm:text-center min-w-0">
                              <div className="sm:hidden text-xs font-bold text-muted mb-0.5">{m.year}</div>
                              <div className="text-xs font-bold uppercase tracking-wide mb-1" style={{ color: style.color }}>
                                {m.label}
                              </div>

                              <div className="flex sm:flex-col items-center gap-3 sm:gap-2">
                                <div
                                  className="w-16 h-24 sm:w-24 sm:h-36 rounded-lg bg-surface bg-cover bg-center shadow-md flex-none border border-line"
                                  style={m.backdropPoster ? { backgroundImage: `url('${m.backdropPoster}')` } : undefined}
                                />
                                <div>
                                  <div className="font-display font-bold text-sm text-ink leading-snug">{m.title}</div>
                                  <p className="text-xs text-muted mt-1 leading-relaxed">{m.explanation}</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
