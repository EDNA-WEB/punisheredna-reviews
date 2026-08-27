'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { IconBookmark } from './Icons';
import { useT } from './TranslationProvider';

type MovieItem = { title: string; slug: string; poster: string | null; year: string | null };

export default function WatchlistDropdown() {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<MovieItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  async function ensureLoaded() {
    if (loaded) return;
    try {
      const res = await fetch('/api/watchlist/recent');
      if (res.ok) setItems(await res.json());
    } catch {}
    setLoaded(true);
  }

  function openNow() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpen(true);
    ensureLoaded();
  }
  function closeSoon() {
    closeTimer.current = setTimeout(() => setOpen(false), 150);
  }

  return (
    <div ref={boxRef} className="relative" onMouseEnter={openNow} onMouseLeave={closeSoon}>
      <button
        onClick={() => {
          setOpen((o) => !o);
          ensureLoaded();
        }}
        className="relative w-10 h-10 flex items-center justify-center text-ink hover:text-accent rounded-full hover:bg-surface transition-colors"
        aria-label={t('movie.chcem_vidiet')}
      >
        <IconBookmark className="w-[22px] h-[22px]" />
      </button>

      {open && (
        <div className="absolute right-0 pt-2 w-72 z-50">
          <div className="rounded-xl border border-line bg-card shadow-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-line font-display font-bold text-sm text-ink">{t('movie.chcem_vidiet')}</div>
            {!loaded ? (
              <div className="px-4 py-4 text-sm text-muted">Načítavam…</div>
            ) : items.length === 0 ? (
              <div className="px-4 py-4 text-sm text-muted">Zatiaľ nič v zozname.</div>
            ) : (
              items.slice(0, 5).map((m) => (
                <Link
                  key={m.slug}
                  href={`/movie/${m.slug}`}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 border-b border-line last:border-b-0 hover:bg-surface"
                >
                  <div
                    className="w-8 h-11 rounded bg-surface bg-cover bg-center flex-none"
                    style={m.poster ? { backgroundImage: `url('${m.poster}')` } : undefined}
                  />
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-ink truncate">{m.title}</div>
                    {m.year && <div className="text-xs text-muted">{m.year}</div>}
                  </div>
                </Link>
              ))
            )}
            <Link
              href="/watchlist"
              onClick={() => setOpen(false)}
              className="block text-center text-xs font-semibold text-accent py-3 border-t border-line hover:bg-surface"
            >
              viac
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
