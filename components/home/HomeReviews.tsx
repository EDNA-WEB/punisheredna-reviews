'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useT } from '../TranslationProvider';
import HomeSectionHead from './HomeSectionHead';
import { GoldStars, HIcon } from './HomeIcons';

export type HomeReview = {
  id: string;
  text: string;
  rating: number;
  likes: number;
  createdAt: string;
  movie: { slug: string; title: string; year: string | null; poster: string | null };
  author: { id: string; name: string; avatar: string | null; critic: boolean };
};
export type ReviewTab = { key: string; label: string; href: string; items: HomeReview[] };

function ago(iso: string, t: (k: string, f?: string) => string) {
  const min = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (min < 60) return t('home2.pred_min', 'před {0} min').replace('{0}', String(min));
  const h = Math.round(min / 60);
  if (h < 24) return t('home2.pred_h', 'před {0} h').replace('{0}', String(h));
  if (h < 48) return t('home2.vcera', 'včera');
  return new Date(iso).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric', timeZone: 'Europe/Prague' });
}

// Recenze so záložkami Nové / Ověření kritici / Od oblíbených — karta s citátom.
export default function HomeReviews({ tabs }: { tabs: ReviewTab[] }) {
  const t = useT();
  const [active, setActive] = useState(0);
  if (!tabs.length) return null;
  const tab = tabs[Math.min(active, tabs.length - 1)];
  return (
    <section>
      <HomeSectionHead icon="quote" title={t('home2.recenze', 'Recenze')} href={tab.href} moreLabel={t('home2.zobrazit_vse', 'Zobrazit vše')}>
        {tabs.length > 1 && (
          <div className="hp-seg" role="tablist">
            {tabs.map((x, i) => (
              <button key={x.key} type="button" role="tab" aria-selected={i === active} className={i === active ? 'hp-seg-on' : ''} onClick={() => setActive(i)}>
                {x.label}
              </button>
            ))}
          </div>
        )}
      </HomeSectionHead>
      <div key={tab.key} className="hp-row sm:!grid sm:grid-cols-2 lg:grid-cols-4 sm:overflow-visible hp-tabs-fade">
        {tab.items.slice(0, 4).map((r) => (
          <article key={r.id} className="hp-rev">
            <Link href={`/movie/${r.movie.slug}`} className="hp-rev-top group">
              {r.movie.poster && <img src={r.movie.poster} alt="" aria-hidden="true" className="hp-rev-bg" />}
              <span className="hp-rev-shade" />
              {r.movie.poster ? <img src={r.movie.poster} alt="" className="hp-rev-poster" /> : <span className="hp-rev-poster" />}
              <span className="min-w-0 relative">
                <span className="block font-display font-bold text-[15px] text-white truncate group-hover:underline">{r.movie.title}</span>
                {r.movie.year && <span className="block text-[12px] text-white/60">{r.movie.year}</span>}
                {r.rating > 0 && (
                  <span className="block mt-1">
                    <GoldStars value={r.rating} />
                  </span>
                )}
              </span>
            </Link>
            <div className="p-4 pt-3 flex flex-col flex-1">
              <span className="hp-q" aria-hidden="true">
                &ldquo;
              </span>
              <Link href={`/movie/${r.movie.slug}`} className="block text-[13.5px] text-ink/90 leading-relaxed -mt-3 line-clamp-4 hover:text-ink">
                {r.text}
              </Link>
              <div className="flex items-center gap-2 mt-auto pt-3 min-w-0">
                <Link href={`/profile/${r.author.id}`} className="flex items-center gap-2 min-w-0 group">
                  {r.author.avatar ? (
                    <img src={r.author.avatar} alt="" className="w-7 h-7 rounded-full object-cover flex-none" />
                  ) : (
                    <span className="w-7 h-7 rounded-full bg-surface flex items-center justify-center text-muted flex-none">
                      <HIcon name="user" className="w-3.5 h-3.5" />
                    </span>
                  )}
                  <span className="min-w-0">
                    <span className="flex items-center gap-1.5 min-w-0">
                      <span className="text-[13px] font-bold text-ink truncate group-hover:text-accent">{r.author.name}</span>
                      {r.author.critic && <span className="ap-critic">{t('home2.kritik', 'KRITIK')}</span>}
                    </span>
                    <span className="block text-[11.5px] text-muted" suppressHydrationWarning>
                      {ago(r.createdAt, t)}
                    </span>
                  </span>
                </Link>
                {r.likes > 0 && (
                  <span className="ml-auto hp-like">
                    <HIcon name="thumb" className="w-3.5 h-3.5" /> {r.likes}
                  </span>
                )}
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
