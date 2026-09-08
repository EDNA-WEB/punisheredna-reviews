'use client';

import { useState } from 'react';
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
  if (visible.length === 0) return null;

  const current = visible.find((c) => c.key === active) || visible[0];
  const grouped = groupByYear(current.items);

  return (
    <div className="border border-line rounded-xl overflow-hidden mb-6">
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
      <div className="p-4 space-y-5 max-h-[480px] overflow-y-auto">
        {grouped.map(([year, items]) => (
          <div key={year}>
            <div className="text-xs font-bold text-muted uppercase tracking-wide mb-2">{year}</div>
            <div className="space-y-2">
              {items.map((item, i) => {
                const content = (
                  <div className="flex items-center gap-3 group">
                    <div
                      className="w-10 h-14 rounded-md bg-surface bg-cover bg-center border border-line flex-none"
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
        ))}
      </div>
    </div>
  );
}
