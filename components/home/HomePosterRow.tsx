'use client';

import Link from 'next/link';
import { useT } from '../TranslationProvider';
import HomeSectionHead from './HomeSectionHead';
import { HIcon, Score } from './HomeIcons';
import { useWatchlist } from './useWatchlist';

export type PosterItem = { id: string; slug: string; title: string; poster: string | null; percent: number | null; sub: string | null; inWatchlist: boolean; match?: number | null };

// Rad plagátov (Oblíbené mezi fanoušky, Doporučujeme pro tebe).
// dark = tmavý blok s odznakom zhody.
export default function HomePosterRow({
  icon,
  title,
  sub,
  href,
  items,
  dark = false
}: {
  icon: string;
  title: string;
  sub?: string;
  href?: string;
  items: PosterItem[];
  dark?: boolean;
}) {
  const t = useT();
  const wl = useWatchlist(Object.fromEntries(items.map((m) => [m.id, m.inWatchlist])));
  if (!items.length) return null;
  const body = (
    <>
      <HomeSectionHead icon={icon} title={title} sub={sub} href={href} moreLabel={t('home2.zobrazit_vse', 'Zobrazit vše')} dark={dark} />
      <div className="hp-row">
        {items.map((m) => (
          <div key={m.id} className="hp-card">
            <div className="relative">
              <Link href={`/movie/${m.slug}`} title={m.title}>
                {m.poster ? <img src={m.poster} alt={m.title} className={`hp-card-img ${dark ? '!shadow-[0_14px_30px_-14px_rgba(0,0,0,.9)]' : ''}`} loading="lazy" /> : <span className="hp-card-img" />}
              </Link>
              <span className="absolute left-2 bottom-2 pointer-events-none">
                <Score percent={m.percent} />
              </span>
              {m.match ? <span className="hp-match pointer-events-none">{t('home2.shoda', '{0} % shoda').replace('{0}', String(m.match))}</span> : null}
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
            <Link href={`/movie/${m.slug}`} className={`block text-[13.5px] font-semibold truncate mt-2.5 ${dark ? 'text-white' : 'text-ink hover:text-accent'}`}>
              {m.title}
            </Link>
            {m.sub && <div className={`text-[12px] truncate ${dark ? 'text-white/55' : 'text-muted'}`}>{m.sub}</div>}
          </div>
        ))}
      </div>
    </>
  );
  return dark ? <section className="hp-foryou -mx-5 sm:mx-0 px-5 sm:px-7 py-6 sm:py-7">{body}</section> : <section>{body}</section>;
}
