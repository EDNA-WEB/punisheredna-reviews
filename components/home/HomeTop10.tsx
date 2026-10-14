'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useT } from '../TranslationProvider';
import HomeSectionHead from './HomeSectionHead';
import { HIcon, Score } from './HomeIcons';
import { useWatchlist } from './useWatchlist';

type Item = { id: string; slug: string; title: string; poster: string | null; percent: number | null; contentType: string; move: number | null; prevRank: number | null; inWatchlist: boolean };

// Top 10 tento týden: veľké obrysové čísla, posun v rebríčku, Vše / Filmy / Seriály.
export default function HomeTop10({ items, showMoves }: { items: Item[]; showMoves: boolean }) {
  const t = useT();
  const [tab, setTab] = useState<'all' | 'film' | 'serial'>('all');
  const wl = useWatchlist(Object.fromEntries(items.map((m) => [m.id, m.inWatchlist])));
  const hasSeries = items.some((m) => m.contentType === 'Seriál');
  const hasFilms = items.some((m) => m.contentType !== 'Seriál');
  const list = items.filter((m) => (tab === 'all' ? true : tab === 'serial' ? m.contentType === 'Seriál' : m.contentType !== 'Seriál'));
  if (!items.length) return null;

  const tabs: [typeof tab, string][] = [
    ['all', t('home2.vse', 'Vše')],
    ['film', t('home2.filmy', 'Filmy')],
    ['serial', t('home2.serialy', 'Seriály')]
  ];

  return (
    <section>
      <HomeSectionHead icon="fire" title={t('home2.top10', 'Top 10 tento týden')} sub={t('home2.top10_sub', 'Nejsledovanější tituly za posledních 7 dní')} href="/top-10" moreLabel={t('home2.zobrazit_vse', 'Zobrazit vše')}>
        {hasSeries && hasFilms && (
          <div className="hp-seg" role="tablist">
            {tabs.map(([k, l]) => (
              <button key={k} type="button" role="tab" aria-selected={tab === k} className={tab === k ? 'hp-seg-on' : ''} onClick={() => setTab(k)}>
                {l}
              </button>
            ))}
          </div>
        )}
      </HomeSectionHead>
      <div key={tab} className="hp-row !gap-6 hp-tabs-fade">
        {list.map((m) => {
          const rank = items.indexOf(m) + 1;
          return (
            <div key={m.id} className={`hp-t10 ${rank === 1 ? 'hp-t10-first' : ''}`}>
              <span className="hp-t10-num" aria-hidden="true">
                {rank}
              </span>
              <div className="relative z-[1]">
                <Link href={`/movie/${m.slug}`} title={m.title} aria-label={`${rank}. ${m.title}`}>
                  {m.poster ? <img src={m.poster} alt={m.title} className="hp-t10-img" loading="lazy" /> : <span className="hp-t10-img" />}
                </Link>
                <span className="absolute left-2 bottom-2 pointer-events-none">
                  <Score percent={m.percent} />
                </span>
                {showMoves && (
                  <span className="absolute left-2 top-2 pointer-events-none">
                    {m.prevRank === null ? (
                      <span className="hp-mv hp-mv-new">{t('home2.nove', 'NOVÉ')}</span>
                    ) : m.move && m.move > 0 ? (
                      <span className="hp-mv hp-mv-up">▲{m.move}</span>
                    ) : m.move && m.move < 0 ? (
                      <span className="hp-mv hp-mv-dn">▼{-m.move}</span>
                    ) : (
                      <span className="hp-mv">–</span>
                    )}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => wl.toggle(m.id)}
                  className={`hp-add ${wl.on[m.id] ? 'hp-add-on' : ''}`}
                  aria-label={wl.on[m.id] ? t('home2.v_seznamu', 'V seznamu') : t('home2.chci_videt', 'Chci vidět')}
                  title={wl.on[m.id] ? t('home2.v_seznamu', 'V seznamu') : t('home2.chci_videt', 'Chci vidět')}
                >
                  <HIcon name={wl.on[m.id] ? 'check' : 'plus'} className="w-4 h-4" sw={2.4} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
