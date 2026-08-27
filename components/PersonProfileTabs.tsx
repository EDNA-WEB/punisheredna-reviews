'use client';

import { useState } from 'react';
import Link from 'next/link';

type Movie = { title: string; slug: string; year: string | null; poster: string | null };
type NewsItem = { title: string; slug: string; coverImage: string | null; movieTitle: string };

export default function PersonProfileTabs({ bio, movies, news }: { bio: string | null; movies: Movie[]; news: NewsItem[] }) {
  const [active, setActive] = useState<'prehlad' | 'zivotopis'>('prehlad');

  return (
    <div>
      <div className="flex gap-2 mb-6 border-b border-line">
        <button
          onClick={() => setActive('prehlad')}
          className={`text-sm font-semibold px-1 pb-3 border-b-2 -mb-px ${active === 'prehlad' ? 'text-accent border-accent' : 'text-muted border-transparent hover:text-ink'}`}
        >
          Prehľad
        </button>
        <button
          onClick={() => setActive('zivotopis')}
          className={`text-sm font-semibold px-1 pb-3 border-b-2 -mb-px ml-6 ${active === 'zivotopis' ? 'text-accent border-accent' : 'text-muted border-transparent hover:text-ink'}`}
        >
          Životopis
        </button>
      </div>

      {active === 'prehlad' ? (
        <div>
          {news.length > 0 && (
            <div className="mb-10">
              <h3 className="font-display font-bold text-lg text-ink mb-4">Súvisiace novinky</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {news.map((n) => (
                  <Link key={n.slug} href={`/news/${n.slug}`} className="block group">
                    <div className="relative rounded-xl overflow-hidden bg-surface aspect-[16/10] mb-2">
                      {n.coverImage && <div className="w-full h-full bg-cover bg-center" style={{ backgroundImage: `url('${n.coverImage}')` }} />}
                    </div>
                    <div className="text-xs font-semibold text-ink group-hover:text-accent transition-colors line-clamp-2">{n.title}</div>
                    <div className="text-[11px] text-muted mt-0.5">{n.movieTitle}</div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          <h3 className="font-display font-bold text-lg text-ink mb-4">Filmy</h3>
          {movies.length === 0 ? (
            <p className="text-sm text-muted">Zatiaľ žiadne filmy priradené k tejto osobe.</p>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
              {movies.map((m) => (
                <Link key={m.slug} href={`/movie/${m.slug}`} className="block group">
                  <div className="rounded-xl overflow-hidden bg-surface aspect-[2/3] mb-1.5">
                    {m.poster && <div className="w-full h-full bg-cover bg-center" style={{ backgroundImage: `url('${m.poster}')` }} />}
                  </div>
                  <div className="text-xs font-semibold text-ink group-hover:text-accent transition-colors truncate">{m.title}</div>
                  {m.year && <div className="text-[11px] text-muted">{m.year}</div>}
                </Link>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div>
          {bio ? (
            <p className="text-[15px] text-ink leading-relaxed whitespace-pre-wrap">{bio}</p>
          ) : (
            <p className="text-sm text-muted">Zatiaľ nie je vyplnený životopis.</p>
          )}
        </div>
      )}
    </div>
  );
}
