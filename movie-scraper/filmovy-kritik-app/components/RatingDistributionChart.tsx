'use client';

import { useState, useEffect, useRef } from 'react';
import { IconStar } from './Icons';

// Rozdelí hodnotenia do 10 košíkov po 0.5 hviezdičky (0.5, 1, 1.5, ... 5).
function buildBuckets(values: number[]) {
  const buckets = Array.from({ length: 10 }, (_, i) => ({ value: (i + 1) * 0.5, count: 0 }));
  for (const v of values) {
    const idx = Math.min(9, Math.max(0, Math.round(v * 2) - 1));
    buckets[idx].count++;
  }
  return buckets;
}

export default function RatingDistributionChart({ values, label }: { values: number[]; label?: string }) {
  const [active, setActive] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 30);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setActive(null);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  if (values.length === 0) return null;

  const buckets = buildBuckets(values);
  const max = Math.max(...buckets.map((b) => b.count), 1);
  const total = values.length;
  const activeBucket = active !== null ? buckets[active] : null;

  return (
    <div ref={containerRef} className="relative">
      <div className="flex items-end gap-[3px] h-12">
        {buckets.map((b, i) => (
          <button
            key={b.value}
            type="button"
            onMouseEnter={() => setActive(i)}
            onMouseLeave={() => setActive((a) => (a === i ? null : a))}
            onClick={() => setActive((a) => (a === i ? null : i))}
            className="flex-1 min-w-0 flex flex-col justify-end h-full group"
            aria-label={`${b.value} ★ — ${b.count}`}
          >
            <div
              className={`w-full rounded-[2px] transition-[height,background-color] duration-500 ease-out ${
                active === i ? 'bg-accent' : 'bg-line group-hover:bg-accent/60'
              }`}
              style={{
                height: mounted ? `${Math.max(3, (b.count / max) * 100)}%` : '0%',
                transitionDelay: mounted ? `${i * 30}ms` : '0ms'
              }}
            />
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between mt-1.5 text-muted">
        <IconStar className="w-3 h-3" filled />
        <span className="inline-flex items-center gap-0.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <IconStar key={i} className="w-3 h-3" filled />
          ))}
        </span>
      </div>

      <div className="h-4 mt-0.5 text-center">
        {activeBucket ? (
          <span className="text-[11px] font-semibold text-ink">
            {activeBucket.value}★ — {activeBucket.count} ({Math.round((activeBucket.count / total) * 100)}%)
          </span>
        ) : (
          <span className="text-[11px] text-muted">{label || 'Rozloženie hodnotení'} ({total})</span>
        )}
      </div>
    </div>
  );
}
