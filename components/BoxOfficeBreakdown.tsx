'use client';

import { useState, useRef } from 'react';
import { formatMoney } from '@/lib/boxOffice';

type Labels = { domace: string; medzinarodne: string; celosvetovo: string; vsetky_uvedenia: string };

export default function BoxOfficeBreakdown({
  domestic,
  international,
  success,
  children,
  labels
}: {
  domestic: number;
  international: number;
  success: boolean;
  children: React.ReactNode;
  labels: Labels;
}) {
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const total = domestic + international;
  const domesticPct = total > 0 ? (domestic / total) * 100 : 0;
  const internationalPct = total > 0 ? (international / total) * 100 : 0;

  function openNow() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpen(true);
  }
  function closeSoon() {
    closeTimer.current = setTimeout(() => setOpen(false), 120);
  }

  return (
    <span className="relative inline-block" onMouseEnter={openNow} onMouseLeave={closeSoon}>
      {children}

      {open && (
        <span className="absolute right-0 sm:left-0 sm:right-auto bottom-full mb-2 z-50 block w-56 not-italic">
          <span className="block rounded-xl border border-line bg-card shadow-lg p-3.5 text-left">
            <span className="block text-[10px] font-bold uppercase tracking-wide text-muted mb-2">{labels.vsetky_uvedenia}</span>

            <span className="block mb-2">
              <span className="flex items-center justify-between text-[11px] font-semibold text-muted mb-0.5">
                <span>{labels.domace} ({domesticPct.toFixed(1)}%)</span>
              </span>
              <span className="block text-sm font-bold text-ink">{formatMoney(domestic)}</span>
            </span>

            <span className="block mb-2">
              <span className="flex items-center justify-between text-[11px] font-semibold text-muted mb-0.5">
                <span>{labels.medzinarodne} ({internationalPct.toFixed(1)}%)</span>
              </span>
              <span className="block text-sm font-bold text-ink">{formatMoney(international)}</span>
            </span>

            <span className="block pt-2 border-t border-line">
              <span className="block text-[11px] font-semibold text-muted mb-0.5">{labels.celosvetovo}</span>
              <span className={`block text-base font-extrabold ${success ? 'text-emerald-600' : 'text-danger'}`}>{formatMoney(total)}</span>
            </span>
          </span>
        </span>
      )}
    </span>
  );
}
