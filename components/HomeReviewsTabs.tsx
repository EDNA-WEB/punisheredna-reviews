'use client';

import { useState } from 'react';
import Link from 'next/link';

// Recenze na hlavnej stránke — jeden box so záložkami namiesto troch boxov
// pod sebou (Nové / Ověření kritici / Od oblíbených). Obsah každej záložky
// vykreslí server (app/page.tsx), tu sa len prepína, ktorá je viditeľná.
type Tab = { key: string; label: string; href: string; content: React.ReactNode };

export default function HomeReviewsTabs({ title, moreLabel, tabs }: { title: string; moreLabel: string; tabs: Tab[] }) {
  const [active, setActive] = useState(0);
  if (tabs.length === 0) return null;
  const tab = tabs[Math.min(active, tabs.length - 1)];

  return (
    <section className="border border-line rounded-xl bg-card p-4 sm:p-5 min-w-0" aria-labelledby="home-recenze">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h2 id="home-recenze" className="font-display font-bold text-base text-ink">
          {title}
        </h2>
        <div className="flex items-center gap-3 min-w-0">
          {tabs.length > 1 && (
            <div role="tablist" className="flex gap-1 bg-surface p-1 rounded-full overflow-x-auto [scrollbar-width:none]">
              {tabs.map((t, i) => (
                <button
                  key={t.key}
                  type="button"
                  role="tab"
                  aria-selected={t.key === tab.key}
                  onClick={() => setActive(i)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                    t.key === tab.key ? 'bg-card text-ink shadow-sm' : 'text-muted hover:text-ink'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          )}
          <Link href={tab.href} className="text-[11px] font-semibold text-white bg-accent px-2.5 py-1 rounded-full hover:bg-accent-dark flex-none">
            {moreLabel}
          </Link>
        </div>
      </div>
      <div role="tabpanel">{tab.content}</div>
    </section>
  );
}
