'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useT } from '../TranslationProvider';
import { HIcon } from './HomeIcons';
import { useWatchlist } from './useWatchlist';

type Item = { id: string; title: string; slug: string; poster: string | null; year: string | null; inWatchlist: boolean };

// Naposledy prohlížené — vždy dole. „Vymazat vše“ a plusko (Chci vidět).
// História je spoločná s appkou (/api/recently-viewed).
export default function HomeRecent({ initialItems }: { initialItems: Item[] }) {
  const t = useT();
  const [items, setItems] = useState(initialItems);
  const wl = useWatchlist(Object.fromEntries(initialItems.map((m) => [m.id, m.inWatchlist])));
  if (!items.length) return null;

  async function clearAll() {
    const prev = items;
    setItems([]);
    try {
      const res = await fetch('/api/recently-viewed', { method: 'DELETE' });
      if (!res.ok) throw new Error();
    } catch {
      setItems(prev);
    }
  }
  const toggle = (id: string) => wl.toggle(id);

  return (
    <section>
      <div className="flex items-center mb-5 min-w-0">
        <span className="hp-hicon">
          <HIcon name="clock" />
        </span>
        <h2 className="font-display font-extrabold text-[21px] sm:text-[25px] tracking-[-0.02em] leading-tight text-ink ml-3 truncate">{t('home2.naposledy', 'Naposledy prohlížené')}</h2>
        <button type="button" onClick={clearAll} className="ml-auto hp-more">
          {t('home2.vymazat_vse', 'Vymazat vše')}
        </button>
      </div>
      <div className="hp-row !gap-3">
        {items.map((m) => (
          <div key={m.id} className="hp-recent">
            <Link href={`/movie/${m.slug}`} className="flex-none">
              {m.poster ? <img src={m.poster} alt="" loading="lazy" /> : <span className="block w-11 h-[66px] rounded-lg bg-surface" />}
            </Link>
            <Link href={`/movie/${m.slug}`} className="min-w-0 flex-1">
              <span className="block text-[13.5px] font-semibold text-ink truncate hover:text-accent">{m.title}</span>
              {m.year && <span className="block text-[12px] text-muted">{m.year}</span>}
            </Link>
            <button
              type="button"
              onClick={() => toggle(m.id)}
              className={`w-8 h-8 rounded-full flex items-center justify-center flex-none border ${wl.on[m.id] ? 'bg-accent border-accent text-white' : 'border-line text-muted hover:text-ink'}`}
              aria-label={wl.on[m.id] ? t('home2.v_seznamu', 'V seznamu') : t('home2.chci_videt', 'Chci vidět')}
              title={wl.on[m.id] ? t('home2.v_seznamu', 'V seznamu') : t('home2.chci_videt', 'Chci vidět')}
            >
              <HIcon name={wl.on[m.id] ? 'check' : 'plus'} className="w-4 h-4" sw={2.4} />
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
