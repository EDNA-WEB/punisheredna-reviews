'use client';

import { useState } from 'react';

export default function PopularityBadge({ value }: { value: number }) {
  const [showInfo, setShowInfo] = useState(false);

  return (
    <div className="relative flex-none">
      <div className="flex items-center gap-2 bg-surface border border-line rounded-lg px-3 py-1.5">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-accent">
          <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
          <polyline points="17 6 23 6 23 12" />
        </svg>
        <div className="text-center">
          <div className="font-display font-bold text-lg text-accent leading-none">{value.toFixed(0)}</div>
          <div className="text-[10px] text-muted mt-0.5 uppercase tracking-wide">Popularita</div>
        </div>
        <button
          type="button"
          onClick={() => setShowInfo((v) => !v)}
          onMouseEnter={() => setShowInfo(true)}
          onMouseLeave={() => setShowInfo(false)}
          className="w-4 h-4 rounded-full border border-muted text-muted text-[10px] font-bold flex items-center justify-center hover:border-accent hover:text-accent transition-colors flex-none"
          aria-label="Čo znamená popularita?"
        >
          i
        </button>
      </div>
      {showInfo && (
        <div className="absolute right-0 top-full mt-2 w-64 bg-card border border-line rounded-lg shadow-lg p-3 z-20 text-xs text-muted leading-relaxed">
          Hodnota popularity pochádza z databázy TMDb a odzrkadľuje, ako často si ľudia túto osobu momentálne prezerajú, hodnotia jej filmy a pridávajú si ich do zoznamov — nie je to hodnotenie kvality, ale miera aktuálneho záujmu.
        </div>
      )}
    </div>
  );
}
