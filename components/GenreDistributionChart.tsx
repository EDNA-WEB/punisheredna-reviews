'use client';

import { useState, useEffect } from 'react';

export default function GenreDistributionChart({ genreCounts }: { genreCounts: { genre: string; count: number }[] }) {
  const [active, setActive] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 30);
    return () => clearTimeout(t);
  }, []);

  if (genreCounts.length === 0) return null;

  const top = genreCounts.slice(0, 5);
  const max = Math.max(...top.map((g) => g.count), 1);
  const total = genreCounts.reduce((n, g) => n + g.count, 0);

  return (
    <div className="border border-line rounded-xl overflow-hidden">
      <div className="bg-surface px-4 py-2.5 border-b border-line">
        <h2 className="font-display font-bold text-sm text-ink">Najsledovanejšie žánre</h2>
      </div>

      <div className="p-4 bg-card space-y-2.5">
        {top.map((g, i) => {
          const pct = (g.count / max) * 100;
          const isActive = active === i;
          return (
            <div
              key={g.genre}
              onMouseEnter={() => setActive(i)}
              onMouseLeave={() => setActive((a) => (a === i ? null : a))}
              onClick={() => setActive((a) => (a === i ? null : i))}
              className="grid grid-cols-[80px_1fr] items-center gap-3 cursor-pointer"
            >
              <span className={`text-xs font-medium truncate ${isActive ? 'text-accent' : 'text-ink'}`}>{g.genre}</span>
              <div className="relative h-2.5 rounded-full bg-line overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 rounded-full bg-accent transition-all duration-700 ease-out"
                  style={{ width: mounted ? `${pct}%` : '0%', transitionDelay: mounted ? `${i * 80}ms` : '0ms' }}
                />
              </div>
            </div>
          );
        })}

        <div className="h-4 pt-1 text-center">
          {active !== null ? (
            <span className="text-[11px] font-semibold text-ink">
              {top[active].genre} — {top[active].count} ({Math.round((top[active].count / total) * 100)}%)
            </span>
          ) : (
            <span className="text-[11px] text-muted">Podľa hodnotených filmov</span>
          )}
        </div>
      </div>
    </div>
  );
}
