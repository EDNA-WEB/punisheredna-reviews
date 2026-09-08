'use client';

import { useState } from 'react';
import Link from 'next/link';
import ScoreBadge from './ScoreBadge';
import PersonFilmographyTabs from './PersonFilmographyTabs';
import { computePercent } from '@/lib/rating';

type Movie = { title: string; slug: string; year: string | null; poster: string | null; ratings?: { value: number }[] };
type NewsItem = { title: string; slug: string; coverImage: string | null; movieTitle: string };
type FilmographyCategory = { key: string; label: string; items: any[] };

export default function PersonProfileMain({
  bio,
  movies,
  news,
  filmographyCategories,
  photos,
  collaborators
}: {
  bio: string | null;
  movies: Movie[];
  news: NewsItem[];
  filmographyCategories: FilmographyCategory[] | null;
  photos: string[];
  collaborators: { id: string; name: string; slug: string; photo: string | null; role: string; count: number }[];
}) {
  const hasFilmography = !!filmographyCategories && filmographyCategories.some((c) => c.items.length > 0);
  const hasPhotos = photos.length > 0;

  const sections = [
    { key: 'prehlad', label: 'Prehľad', enabled: true },
    { key: 'filmografia', label: 'Filmografia', enabled: hasFilmography },
    { key: 'fotogaleria', label: 'Fotogaléria', enabled: hasPhotos },
    { key: 'zivotopis', label: 'Životopis', enabled: !!bio }
  ].filter((s) => s.enabled);

  const [active, setActive] = useState(sections[0].key);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  const knownFor = [...movies]
    .map((m) => ({ ...m, percent: m.ratings ? computePercent(m.ratings) : null }))
    .sort((a, b) => (b.percent ?? -1) - (a.percent ?? -1))
    .slice(0, 6);

  return (
    <div>
      {/* Sticky navigácia sekcií — zostáva viditeľná aj pri skrolovaní */}
      <div className="sticky top-16 z-10 bg-bg/95 backdrop-blur-sm border-b border-line mb-6 -mx-1 px-1">
        <div className="flex gap-1 overflow-x-auto">
          {sections.map((s) => (
            <button
              key={s.key}
              onClick={() => setActive(s.key)}
              className={`text-sm font-semibold px-3 py-3 border-b-2 -mb-px flex-none transition-colors ${
                active === s.key ? 'text-accent border-accent' : 'text-muted border-transparent hover:text-ink'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {active === 'prehlad' && (
        <div>
          {knownFor.length > 0 && (
            <div className="mb-8">
              <h3 className="font-display font-bold text-lg text-ink mb-4">Známy/-a z</h3>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-4">
                {knownFor.map((m) => (
                  <Link key={m.slug} href={`/movie/${m.slug}`} className="block group">
                    <div className="relative rounded-xl overflow-hidden bg-surface aspect-[2/3] mb-1.5">
                      {m.poster && (
                        <div
                          className="w-full h-full bg-cover bg-center transition-transform duration-300 group-hover:scale-[1.03]"
                          style={{ backgroundImage: `url('${m.poster}')` }}
                        />
                      )}
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

          {collaborators.length > 0 && (
            <div className="mb-8">
              <h3 className="font-display font-bold text-lg text-ink mb-1">Často spolupracuje s</h3>
              <p className="text-xs text-muted mb-4">Na základe filmov, čo máme u nás v databáze.</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {collaborators.map((c) => (
                  <Link key={c.id} href={`/osobnost/${c.slug}`} className="flex items-center gap-3 border border-line rounded-xl p-3 hover:border-accent transition-colors group">
                    <div className="w-11 h-11 rounded-full bg-surface bg-cover bg-center flex-none" style={c.photo ? { backgroundImage: `url('${c.photo}')` } : undefined} />
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-ink group-hover:text-accent transition-colors truncate">{c.name}</div>
                      <div className="text-[11px] text-muted truncate">
                        {c.role} · {c.count} {c.count === 1 ? 'film' : c.count < 5 ? 'filmy' : 'filmov'} spolu
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {bio && (
            <div className="mb-2">
              <h3 className="font-display font-bold text-lg text-ink mb-3">Životopis</h3>
              <p className="text-[15px] text-ink leading-relaxed whitespace-pre-wrap line-clamp-6">{bio}</p>
              <button onClick={() => setActive('zivotopis')} className="text-sm font-semibold text-accent hover:underline mt-2">
                Zobraziť celý životopis
              </button>
            </div>
          )}
        </div>
      )}

      {active === 'filmografia' && (
        <div>
          {hasFilmography && <PersonFilmographyTabs categories={filmographyCategories!} />}
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
      )}

      {active === 'fotogaleria' && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
          {photos.map((url, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setLightboxUrl(url)}
              className="rounded-lg bg-surface bg-cover bg-center aspect-[2/3] hover:opacity-90 transition-opacity"
              style={{ backgroundImage: `url('${url}')` }}
            />
          ))}
        </div>
      )}

      {lightboxUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4"
          onClick={() => setLightboxUrl(null)}
        >
          <button
            type="button"
            onClick={() => setLightboxUrl(null)}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors"
          >
            ✕
          </button>
          <img src={lightboxUrl} alt="Fotka v plnej veľkosti" className="max-w-full max-h-full rounded-lg object-contain" />
        </div>
      )}

      {active === 'zivotopis' && (
        <p className="text-[15px] text-ink leading-relaxed whitespace-pre-wrap">{bio}</p>
      )}
    </div>
  );
}
