'use client';

import { useState } from 'react';
import Link from 'next/link';
import PersonMiniGrid from './PersonMiniGrid';
import PersonMemorialGrid from './PersonMemorialGrid';
import { IconCake, IconCandle } from './Icons';

// Jeden box na hlavnej stránke namiesto štyroch: Najsledovanejší herci →
// tvorcovia → Dnes slávia narodeniny → Naposledy zomreli. Každých 30 s sa
// sám prepne na ďalšiu skupinu (tenký pásik dole ukazuje, kedy). Pri prejdení
// myšou sa striedanie pozastaví; kliknutím na záložku sa dá prepnúť ručne.
// Časovač je CSS animácia pásika — prehliadač ju sám zastaví na skrytej karte.

type Person = { id: string; name: string; slug: string; photo: string | null; birthDate?: Date | string | null; deathDate?: Date | string | null };
export type RotatorTab = {
  key: 'actors' | 'creators' | 'birthdays' | 'deceased';
  label: string; // krátky názov záložky
  title: string; // plný nadpis
  moreHref?: string;
  items: Person[];
};

const INTERVAL_S = 30;

export default function PeopleRotator({ tabs, moreLabel }: { tabs: RotatorTab[]; moreLabel: string }) {
  const visible = tabs.filter((t) => t.items.length > 0);
  const [active, setActive] = useState(0);
  const [cycle, setCycle] = useState(0); // reštart pásika pri ručnom prepnutí
  const [paused, setPaused] = useState(false);
  if (visible.length === 0) return null;

  const idx = active % visible.length;
  const tab = visible[idx];
  const go = (i: number) => {
    setActive(i);
    setCycle((c) => c + 1);
  };
  const icon =
    tab.key === 'birthdays' ? <IconCake className="w-4 h-4 text-accent" /> : tab.key === 'deceased' ? <IconCandle className="w-4 h-4 text-muted" /> : null;

  return (
    <div
      className="mt-8 border border-line rounded-xl bg-card min-w-0 overflow-hidden"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <style>{`
        @keyframes prFade { from { opacity: 0; transform: translateY(4px) } to { opacity: 1; transform: none } }
        @keyframes prProgress { from { width: 0% } to { width: 100% } }
      `}</style>

      <div className="p-4 pb-3">
        {/* Nadpis aktívnej skupiny + "viac" */}
        <div className="flex items-center justify-between gap-3 mb-3">
          <h3 className="font-display font-bold text-sm text-ink flex items-center gap-2 min-w-0">
            {icon}
            <span className="truncate">{tab.title}</span>
          </h3>
          {tab.moreHref && (
            <Link href={tab.moreHref} className="text-[11px] font-semibold text-white bg-accent px-2.5 py-1 rounded-full hover:bg-accent-dark flex-none">
              {moreLabel}
            </Link>
          )}
        </div>

        {/* Obsah — s jemným prelínaním pri zmene */}
        <div key={`${tab.key}-${cycle}`} style={{ animation: 'prFade .35s ease' }}>
          {tab.key === 'actors' || tab.key === 'creators' ? (
            <PersonMiniGrid title={tab.title} items={tab.items} noWrapper hideHeader />
          ) : (
            <PersonMemorialGrid title={tab.title} items={tab.items as any} mode={tab.key === 'birthdays' ? 'birthday' : 'death'} hideHeader />
          )}
        </div>

        {/* Záložky */}
        {visible.length > 1 && (
          <div className="flex gap-1.5 mt-3 overflow-x-auto" role="tablist">
            {visible.map((t, i) => (
              <button
                key={t.key}
                type="button"
                role="tab"
                aria-selected={i === idx}
                onClick={() => go(i)}
                className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border flex-none transition-colors ${
                  i === idx ? 'bg-accent text-white border-accent' : 'border-line text-muted hover:text-ink hover:border-accent'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Pásik času do ďalšieho prepnutia */}
      {visible.length > 1 && (
        <div className="h-0.5 bg-line">
          <div
            key={`p-${idx}-${cycle}`}
            className="h-full bg-accent/70"
            style={{ animation: `prProgress ${INTERVAL_S}s linear forwards`, animationPlayState: paused ? 'paused' : 'running' }}
            onAnimationEnd={() => setActive((a) => (a + 1) % visible.length)}
          />
        </div>
      )}
    </div>
  );
}
