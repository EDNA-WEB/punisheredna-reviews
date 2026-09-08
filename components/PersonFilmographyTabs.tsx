'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';

type FilmItem = { tmdbId: number; title: string; year: string; roleLabel: string | null; poster: string | null; ourSlug: string | null };
type Category = { key: string; label: string; items: FilmItem[] };

function groupByYear(items: FilmItem[]) {
  const groups = new Map<string, FilmItem[]>();
  for (const item of items) {
    const key = item.year || 'Neznámy rok';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(item);
  }
  return Array.from(groups.entries()).sort((a, b) => b[0].localeCompare(a[0]));
}

export default function PersonFilmographyTabs({ categories }: { categories: Category[] }) {
  const visible = categories.filter((c) => c.items.length > 0);
  const [active, setActive] = useState(visible[0]?.key);
  const [query, setQuery] = useState('');
  if (visible.length === 0) return null;

  const current = visible.find((c) => c.key === active) || visible[0];
  const filteredItems = query.trim()
    ? current.items.filter((item) => item.title.toLowerCase().includes(query.trim().toLowerCase()))
    : current.items;
  const grouped = groupByYear(filteredItems);

  return (
    <div className="border border-line rounded-xl overflow-hidden mb-6">
      {/* Filter chipy podľa kategórie (Herectvo / Réžia / Scenár...) */}
      <div className="bg-surface px-4 pt-3 flex gap-1 overflow-x-auto">
        {visible.map((c) => (
          <button
            key={c.key}
            onClick={() => setActive(c.key)}
            className={`text-xs font-semibold px-3 py-2 rounded-t-lg flex-none transition-colors ${
              current.key === c.key ? 'bg-card text-accent' : 'text-muted hover:text-ink'
            }`}
          >
            {c.label} <span className="opacity-60">({c.items.length})</span>
          </button>
        ))}
      </div>

      {/* Vyhľadávanie priamo v aktuálnej kategórii */}
      <div className="px-4 py-2.5 border-b border-line bg-card">
        <div className="relative max-w-xs">
          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.3-4.3" strokeLinecap="round" />
          </svg>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Hľadať v tejto filmografii…"
            className="field-input text-xs py-1.5"
            style={{ paddingLeft: '2rem' }}
          />
        </div>
      </div>

      <div className="p-4 space-y-5 max-h-[520px] overflow-y-auto">
        {grouped.length === 0 ? (
          <p className="text-sm text-muted text-center py-6">Nič nenájdené.</p>
        ) : (
          grouped.map(([year, items]) => (
            <div key={year}>
              <div className="text-xs font-bold text-muted uppercase tracking-wide mb-2">{year}</div>
              <div className="space-y-2">
                {items.map((item, i) => {
                  const content = (
                    <div className="flex items-center gap-3 group">
                      <div
                        className="w-10 h-14 rounded-md bg-surface bg-cover bg-center border border-line flex-none transition-transform group-hover:scale-105"
                        style={item.poster ? { backgroundImage: `url('${item.poster}')` } : undefined}
                      />
                      <div className="min-w-0 flex-1">
                        <div className={`text-sm font-semibold leading-snug truncate ${item.ourSlug ? 'text-accent group-hover:underline' : 'text-ink'}`}>
                          {item.title}
                        </div>
                        {item.roleLabel && <div className="text-xs text-muted truncate">{item.roleLabel}</div>}
                      </div>
                    </div>
                  );
                  return item.ourSlug ? (
                    <Link key={`${item.tmdbId}-${i}`} href={`/movie/${item.ourSlug}`} className="block">
                      {content}
                    </Link>
                  ) : (
                    <div key={`${item.tmdbId}-${i}`}>{content}</div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
