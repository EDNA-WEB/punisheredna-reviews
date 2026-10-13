'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import PersonFilmographyTabs from '../PersonFilmographyTabs';
import { useT } from '../TranslationProvider';
import type { CareerStats } from '@/lib/personData';

// Záložky nového profilu osobnosti: Přehled / Filmografie / Fotogalerie / Novinky / Životopis.

type Movie = { slug: string; title: string; year: string | null; poster: string | null; percent: number | null; roleLabel: string | null };
type News = { title: string; slug: string; coverImage: string | null; movieTitle: string };
type Category = { key: string; label: string; items: any[] };

function scoreBg(p: number) {
  return p >= 70 ? '#059669' : p >= 20 ? '#2563EB' : '#15171A';
}
const Score = ({ p }: { p: number | null }) =>
  p === null ? null : (
    <span className="ps-score" style={{ backgroundColor: scoreBg(p) }}>
      {p}%
    </span>
  );
const Arrow = () => (
  <svg className="w-[15px] h-[15px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 12h14m-5-5.5L19.5 12 14 17.5" />
  </svg>
);

export default function PersonTabs({
  movies,
  career,
  photos,
  news,
  bio,
  categories,
  filmographyCount,
  sidebar
}: {
  movies: Movie[];
  career: CareerStats;
  photos: string[];
  news: News[];
  bio: string | null;
  categories: Category[] | null;
  filmographyCount: number;
  sidebar: ReactNode;
}) {
  const t = useT();
  const nf = (n: number) => n.toLocaleString('cs-CZ');
  const hasFilmography = !!categories && categories.some((c) => c.items.length > 0);
  const tabs = [
    { key: 'prehled', label: t('osoba.tab_prehled', 'Přehled'), show: true },
    { key: 'filmografie', label: t('osoba.tab_filmografie', 'Filmografie'), count: filmographyCount || movies.length, show: hasFilmography || movies.length > 0 },
    { key: 'foto', label: t('osoba.tab_fotogalerie', 'Fotogalerie'), count: photos.length, show: photos.length > 0 },
    { key: 'novinky', label: t('osoba.tab_novinky', 'Novinky'), count: news.length, show: news.length > 0 },
    { key: 'zivotopis', label: t('osoba.tab_zivotopis', 'Životopis'), show: !!bio }
  ].filter((x) => x.show);
  const [active, setActive] = useState('prehled');
  const [lightbox, setLightbox] = useState<number | null>(null);

  useEffect(() => {
    if (lightbox === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightbox(null);
      if (e.key === 'ArrowRight') setLightbox((i) => (i === null ? i : (i + 1) % photos.length));
      if (e.key === 'ArrowLeft') setLightbox((i) => (i === null ? i : (i - 1 + photos.length) % photos.length));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightbox, photos.length]);

  function go(key: string) {
    setActive(key);
    document.getElementById('osoba-zalozky')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  const head = (title: string, key?: string, count?: number, extra?: ReactNode) => (
    <div className="flex items-center gap-2.5 mb-3.5">
      <h2 className="font-display font-bold text-[20px] tracking-tight text-ink">{title}</h2>
      {extra}
      {key && count !== undefined && count > 0 && (
        <button type="button" onClick={() => go(key)} className="ml-auto inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-muted hover:text-ink">
          {t('osoba.vse', 'Vše')} {nf(count)} <Arrow />
        </button>
      )}
    </div>
  );

  const posterCard = (m: Movie) => (
    <Link key={m.slug} href={`/movie/${m.slug}`} className="group min-w-0">
      <div className="relative">
        {m.poster ? <img src={m.poster} alt={m.title} className="pf-poster w-full aspect-[2/3]" loading="lazy" /> : <div className="pf-poster w-full aspect-[2/3] bg-surface2" />}
        {m.percent !== null && (
          <span className="absolute left-[7px] bottom-[7px]">
            <Score p={m.percent} />
          </span>
        )}
      </div>
      <div className="text-[13px] font-semibold text-ink mt-2 truncate group-hover:text-accent">{m.title}</div>
      <div className="text-[12px] text-muted truncate">{[m.roleLabel, m.year].filter(Boolean).join(' · ')}</div>
    </Link>
  );

  const maxBar = Math.max(1, ...career.bars.map((b) => b.count));
  const labelEvery = Math.max(1, Math.ceil(career.bars.length / 8));

  const newsCard = (n: News) => (
    <Link key={n.slug} href={`/news/${n.slug}`} className="ap-card overflow-hidden group">
      {n.coverImage ? <img src={n.coverImage} alt="" className="w-full h-[140px] object-cover transition-transform duration-500 group-hover:scale-[1.03]" loading="lazy" /> : <div className="w-full h-[140px] bg-surface2" />}
      <div className="p-4">
        {n.movieTitle && <div className="ap-label !text-accent truncate">{n.movieTitle}</div>}
        <div className="font-display font-bold text-[15.5px] leading-snug text-ink mt-1 line-clamp-2 group-hover:text-accent">{n.title}</div>
      </div>
    </Link>
  );

  return (
    <div id="osoba-zalozky" className="scroll-mt-28">
      <div className="pf-tabs-wrap ap-noscroll" role="tablist">
        <div className="pf-tabs">
          {tabs.map((tb) => (
            <button key={tb.key} type="button" role="tab" aria-selected={active === tb.key} onClick={() => setActive(tb.key)} className={`pf-tab ${active === tb.key ? 'is-on' : ''}`}>
              {tb.label}
              {tb.count ? <span className="pf-tab-count">{nf(tb.count)}</span> : null}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px] items-start">
        <div className="min-w-0">
          {active === 'prehled' && (
            <div className="space-y-9">
              {movies.length > 0 && (
                <section>
                  {head(t('osoba.filmy_u_nas', 'Filmy a seriály u nás'), 'filmografie', movies.length)}
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 sm:gap-3.5">{movies.slice(0, 6).map(posterCard)}</div>
                </section>
              )}

              {career.bars.length > 1 && (
                <section className="ap-card p-5">
                  {head(
                    t('osoba.kariera_v_cislech', 'Kariéra v číslech'),
                    undefined,
                    undefined,
                    career.firstYear ? (
                      <span className="ml-auto text-[13px] font-medium text-muted">
                        {career.firstYear}–{career.lastYear}
                      </span>
                    ) : null
                  )}
                  <div className="ps-bars" role="img" aria-label={t('osoba.filmy_po_letech', 'Počet filmů po letech')}>
                    {career.bars.map((b, i) => (
                      <div key={b.from} className="ps-bar-col" title={`${b.label}: ${b.count}`}>
                        <div className="ps-bar" style={{ height: `${Math.max(b.count ? 6 : 2, (b.count / maxBar) * 100)}%`, opacity: b.count ? 0.5 + (b.count / maxBar) * 0.5 : 0.25 }} />
                        <span className="ps-bar-label">{i % labelEvery === 0 ? `’${String(b.from).slice(2)}` : ''}</span>
                      </div>
                    ))}
                  </div>
                  <div className="grid sm:grid-cols-3 gap-3 mt-4">
                    {[
                      career.busiestYear && [t('osoba.nejaktivnejsi_rok', 'Nejaktivnější rok'), `${career.busiestYear.year} · ${career.busiestYear.count} ${t('osoba.titulu', 'titulů')}`],
                      career.topGenre && [t('osoba.nejcastejsi_zanr', 'Nejčastější žánr'), `${career.topGenre.genre} · ${career.topGenre.percent} %`],
                      career.bestDecade && [t('osoba.nejlepsi_obdobi', 'Nejlépe hodnocené období'), `${career.bestDecade.label} · ${career.bestDecade.percent} %`]
                    ]
                      .filter(Boolean)
                      .map((x) => {
                        const [k, v] = x as [string, string];
                        return (
                          <div key={k} className="rounded-xl bg-surface px-3.5 py-3">
                            <div className="ap-label !text-[9.5px]">{k}</div>
                            <div className="font-display font-bold text-[15px] text-ink mt-1">{v}</div>
                          </div>
                        );
                      })}
                  </div>
                </section>
              )}

              {photos.length > 0 && (
                <section>
                  {head(t('osoba.fotogalerie', 'Fotogalerie'), 'foto', photos.length)}
                  <div className="ps-mosaic">
                    {photos.slice(0, 5).map((url, i) => (
                      <button key={i} type="button" onClick={() => (i === 4 && photos.length > 5 ? go('foto') : setLightbox(i))} className={`ps-mosaic-item ${i === 0 ? 'is-big' : ''}`}>
                        <img src={url} alt="" loading="lazy" />
                        {i === 4 && photos.length > 5 && <span className="ps-mosaic-more">+{photos.length - 4}</span>}
                      </button>
                    ))}
                  </div>
                </section>
              )}

              {news.length > 0 && (
                <section>
                  {head(t('osoba.souvisejici_novinky', 'Související novinky'), 'novinky', news.length)}
                  <div className="grid sm:grid-cols-2 gap-3.5">{news.slice(0, 2).map(newsCard)}</div>
                </section>
              )}

              {bio && (
                <section className="ap-card p-5">
                  {head(t('osoba.zivotopis', 'Životopis'))}
                  <p className="text-[15px] text-ink leading-relaxed whitespace-pre-wrap line-clamp-5">{bio}</p>
                  <button type="button" onClick={() => go('zivotopis')} className="text-[13.5px] font-semibold text-accent hover:underline mt-2">
                    {t('osoba.cely_zivotopis', 'Celý životopis')}
                  </button>
                </section>
              )}

              {movies.length === 0 && !bio && photos.length === 0 && <p className="text-[14px] text-muted">{t('osoba.zatim_nic', 'Zatím tu nic není.')}</p>}
            </div>
          )}

          {active === 'filmografie' && (
            <div>
              {hasFilmography && <PersonFilmographyTabs categories={categories!} />}
              {head(t('osoba.vsechny_u_nas', 'Všechny filmy a seriály u nás'))}
              {movies.length === 0 ? (
                <p className="text-[14px] text-muted">{t('osoba.zadne_filmy', 'Zatím žádné filmy u nás.')}</p>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 sm:gap-3.5">{movies.map(posterCard)}</div>
              )}
            </div>
          )}

          {active === 'foto' && (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
              {photos.map((url, i) => (
                <button key={i} type="button" onClick={() => setLightbox(i)} className="ps-photo-btn">
                  <img src={url} alt="" loading="lazy" />
                </button>
              ))}
            </div>
          )}

          {active === 'novinky' && <div className="grid sm:grid-cols-2 gap-3.5">{news.map(newsCard)}</div>}

          {active === 'zivotopis' && (
            <div className="ap-card p-5 sm:p-6">
              <p className="text-[15.5px] text-ink leading-relaxed whitespace-pre-wrap">{bio}</p>
            </div>
          )}
        </div>

        <aside className="min-w-0 lg:sticky lg:top-24">{sidebar}</aside>
      </div>

      {lightbox !== null && photos[lightbox] && (
        <div className="fixed inset-0 z-[70] bg-black/90 flex items-center justify-center p-4" onClick={() => setLightbox(null)} role="dialog" aria-modal="true">
          <img src={photos[lightbox]} alt={t('osoba.fotka', 'Fotka')} className="max-w-full max-h-full rounded-lg object-contain" onClick={(e) => e.stopPropagation()} />
          <button type="button" onClick={() => setLightbox(null)} className="ps-lb-btn top-4 right-4" aria-label={t('osoba.zavrit', 'Zavřít')}>
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
          {photos.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setLightbox((i) => (i === null ? i : (i - 1 + photos.length) % photos.length));
                }}
                className="ps-lb-btn left-4 top-1/2 -translate-y-1/2"
                aria-label="‹"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="m14.5 5.5-6.5 6.5 6.5 6.5" />
                </svg>
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setLightbox((i) => (i === null ? i : (i + 1) % photos.length));
                }}
                className="ps-lb-btn right-4 top-1/2 -translate-y-1/2"
                aria-label="›"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="m9.5 5.5 6.5 6.5-6.5 6.5" />
                </svg>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
