'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { IconCheck, IconPlus } from './Icons';
import { useT } from './TranslationProvider';

type Item = { id: string; title: string; slug: string; poster: string | null; year: string | null; inWatchlist: boolean };

// Nedávno prohlížené — spodok hlavnej stránky. Najviac 7 titulov, vždy
// rozbalené (bez šípky), „Vymazat vše“ vpravo. Plusko v rohu plagátu pridá
// film do Chci vidět (druhým kliknutím ho odoberie). História je spoločná
// s mobilnou appkou.
export default function RecentlyViewedSection({ initialItems }: { initialItems: Item[] }) {
  const t = useT();
  const [items, setItems] = useState<Item[]>(initialItems);
  const [busy, setBusy] = useState<string | null>(null);
  const rowRef = useRef<HTMLDivElement>(null);
  const scroll = (dir: 1 | -1) => rowRef.current?.scrollBy({ left: dir * rowRef.current.clientWidth * 0.85, behavior: 'smooth' });

  if (items.length === 0) return null;

  async function clearAll() {
    const previous = items;
    setItems([]);
    try {
      const res = await fetch('/api/recently-viewed', { method: 'DELETE' });
      if (!res.ok) throw new Error();
    } catch {
      setItems(previous);
    }
  }

  async function toggleWatchlist(movieId: string) {
    if (busy) return;
    setBusy(movieId);
    setItems((list) => list.map((m) => (m.id === movieId ? { ...m, inWatchlist: !m.inWatchlist } : m)));
    try {
      const res = await fetch('/api/watchlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ movieId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error();
      setItems((list) => list.map((m) => (m.id === movieId ? { ...m, inWatchlist: !!data.inWatchlist } : m)));
    } catch {
      setItems((list) => list.map((m) => (m.id === movieId ? { ...m, inWatchlist: !m.inWatchlist } : m)));
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="border border-line rounded-xl bg-card p-4 sm:p-5" aria-labelledby="nedavno-prohlizene">
      <div className="flex items-center justify-between gap-4 mb-4">
        <h2 id="nedavno-prohlizene" className="font-display font-bold text-base text-ink">
          {t('home.nedavno_prezerane')}
        </h2>
        <div className="flex items-center gap-3">
          <button type="button" onClick={clearAll} className="text-xs font-semibold text-accent hover:underline py-1">
            {t('home.vymazat_vsetko')}
          </button>
          {/* Šípky namiesto sivého posuvníka (len počítač, na mobile sa ťahá prstom) */}
          <div className="hidden sm:flex gap-2">
            <button type="button" onClick={() => scroll(-1)} aria-label={t('home.posunut_vlavo')} className="w-8 h-8 rounded-full border border-line bg-card text-ink hover:border-accent flex items-center justify-center">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M15 6l-6 6 6 6" /></svg>
            </button>
            <button type="button" onClick={() => scroll(1)} aria-label={t('home.posunut_vpravo')} className="w-8 h-8 rounded-full border border-line bg-card text-ink hover:border-accent flex items-center justify-center">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M9 6l6 6-6 6" /></svg>
            </button>
          </div>
        </div>
      </div>

      <div ref={rowRef} className="flex gap-3 overflow-x-auto pb-1 snap-x [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map((m) => (
          <div key={m.id} className="relative flex-none w-[118px] sm:w-[132px] lg:w-[calc((100%-72px)/7)] snap-start">
            <Link href={`/movie/${m.slug}`} className="group block">
              <div
                className="aspect-[2/3] rounded-lg border border-line bg-surface bg-cover bg-center overflow-hidden"
                style={m.poster ? { backgroundImage: `url('${m.poster}')` } : undefined}
              />
              <div className="mt-2 text-sm font-semibold text-ink truncate group-hover:text-accent transition-colors">{m.title}</div>
              {m.year && <div className="text-xs text-muted">{m.year}</div>}
            </Link>
            <button
              type="button"
              onClick={() => toggleWatchlist(m.id)}
              disabled={busy === m.id}
              aria-label={m.inWatchlist ? t('home.odobrat_chcem_vidiet') : t('home.pridat_chcem_vidiet')}
              title={m.inWatchlist ? t('home.odobrat_chcem_vidiet') : t('home.pridat_chcem_vidiet')}
              className={`absolute top-0 left-0 w-9 h-9 flex items-center justify-center rounded-tl-lg rounded-br-lg text-white transition-colors disabled:opacity-60 ${
                m.inWatchlist ? 'bg-accent' : 'bg-black/60 hover:bg-black/80'
              }`}
            >
              {m.inWatchlist ? <IconCheck className="w-4 h-4" /> : <IconPlus className="w-4 h-4" />}
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
