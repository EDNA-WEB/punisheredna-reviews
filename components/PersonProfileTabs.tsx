'use client';

import { useState } from 'react';
import Link from 'next/link';
import ScoreBadge from './ScoreBadge';
import { computePercent } from '@/lib/rating';

type Movie = { title: string; slug: string; year: string | null; poster: string | null; ratings?: { value: number }[] };
type NewsItem = { title: string; slug: string; coverImage: string | null; movieTitle: string };

const BIO_COLLAPSED_LENGTH = 420;

export default function PersonProfileTabs({ bio, movies, news }: { bio: string | null; movies: Movie[]; news: NewsItem[] }) {
  const [bioExpanded, setBioExpanded] = useState(false);

  const knownFor = [...movies]
    .map((m) => ({ ...m, percent: m.ratings ? computePercent(m.ratings) : null }))
    .sort((a, b) => (b.percent ?? -1) - (a.percent ?? -1))
    .slice(0, 6);

  const bioIsLong = !!bio && bio.length > BIO_COLLAPSED_LENGTH;
  const bioText = bioIsLong && !bioExpanded ? bio!.slice(0, BIO_COLLAPSED_LENGTH).trim() + '…' : bio;

  return (
    <div>
      {bio && (
        <div className="mb-8">
          <h3 className="font-display font-bold text-lg text-ink mb-3">Životopis</h3>
          <p className="text-[15px] text-ink leading-relaxed whitespace-pre-wrap">{bioText}</p>
          {bioIsLong && (
            <button
              onClick={() => setBioExpanded((v) => !v)}
              className="text-sm font-semibold text-accent hover:underline mt-2"
            >
              {bioExpanded ? 'Zobraziť menej' : 'Zobraziť viac'}
            </button>
          )}
        </div>
      )}

      {knownFor.length > 0 && (
        <div className="mb-8">
          <h3 className="font-display font-bold text-lg text-ink mb-4">Známy/-a z</h3>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-4">
            {knownFor.map((m) => (
              <Link key={m.slug} href={`/movie/${m.slug}`} className="block group">
                <div className="relative rounded-xl overflow-hidden bg-surface aspect-[2/3] mb-1.5">
                  {m.poster && <div className="w-full h-full bg-cover bg-center transition-transform duration-300 group-hover:scale-[1.03]" style={{ backgroundImage: `url('${m.poster}')` }} />}
                  <div className="absolute bottom-1.5 left-1.5">
                    <ScoreBadge percent={m.percent} count={0} size="sm" />
                  </div>
                </div>
                <div className="text-xs font-semibold text-ink group-hover:text-accent transition-colors truncate">{m.title}</div>
                {m.year && <div className="text-[11px] text-muted">{m.year}</div>}
              </Link>
            ))}
          </div>
        </div>
      )}

      {news.length > 0 && (
        <div className="mb-8">
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

      <div>
        <h3 className="font-display font-bold text-lg text-ink mb-4">Všetky filmy a seriály u nás</h3>
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
    </div>
  );
}
