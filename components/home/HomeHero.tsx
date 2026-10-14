'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useT } from '../TranslationProvider';
import YouTubeSubtitlePlayer from '../YouTubeSubtitlePlayer';
import LayerModal from '../LayerModal';
import { HIcon, Score } from './HomeIcons';
import type { HeroTrailer, HomePremiere, HomePulse } from '@/lib/homeData';
import { useWatchlist } from './useWatchlist';

const ROTATE_MS = 10000;

const TZ = 'Europe/Prague';
const pragueDay = (d: Date | string) => new Date(d).toLocaleDateString('en-CA', { timeZone: TZ });
// Dni do premiéry v pražskom čase — server (UTC) aj prehliadač vypočítajú to isté
function daysUntil(iso: string) {
  return Math.round((Date.parse(pragueDay(iso)) - Date.parse(pragueDay(new Date()))) / 86400000);
}

// Úvod hlavnej stránky: záber z traileru cez celú šírku, údaje o filme,
// prehrávanie v okne nad stránkou, prepínanie trailerov, V kinech brzy,
// súťaž a pulz webu.
export default function HomeHero({
  trailers,
  premieres,
  pulse,
  contest,
  canWatchlist
}: {
  trailers: HeroTrailer[];
  premieres: HomePremiere[];
  pulse: HomePulse;
  contest: { href: string; title: string } | null;
  canWatchlist: boolean;
}) {
  const t = useT();
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [playing, setPlaying] = useState<HeroTrailer | null>(null);
  const wl = useWatchlist(Object.fromEntries(trailers.map((x) => [x.movie.id, x.movie.inWatchlist])));
  const watch = wl.on;
  const close = useCallback(() => setPlaying(null), []);

  useEffect(() => {
    if (paused || playing || trailers.length < 2) return;
    const id = setTimeout(() => setActive((a) => (a + 1) % trailers.length), ROTATE_MS);
    return () => clearTimeout(id);
  }, [active, paused, playing, trailers.length]);

  const cur = trailers[active % Math.max(1, trailers.length)];

  function play(tr: HeroTrailer) {
    setPlaying(tr);
    fetch('/api/trailers/view', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ trailerId: tr.id }) }).catch(() => {});
  }

  const toggleWatch = (movieId: string) => wl.toggle(movieId);

  const nf = (n: number) => n.toLocaleString('cs-CZ');
  const premiereChip = (() => {
    if (!cur?.movie.premiere) return null;
    const d = daysUntil(cur.movie.premiere);
    if (d <= 0) return t('home2.v_kinech_dnes', 'V kinech od dnes');
    if (d === 1) return t('home2.v_kinech_zitra', 'V kinech zítra');
    if (d <= 30) return t('home2.v_kinech_za', 'V kinech za {0} dní').replace('{0}', String(d));
    return `${t('home2.v_kinech_od', 'V kinech od')} ${new Date(cur.movie.premiere).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric', timeZone: TZ })}`;
  })();

  return (
    <section className="hp-hero -mx-5 sm:mx-0" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      {cur?.image && (
        <img
          key={cur.id}
          src={cur.image}
          alt=""
          aria-hidden="true"
          className="hp-hero-img"
          onError={(e) => {
            // maxresdefault nemá každé video — náhradný záber z YouTube
            const el = e.currentTarget;
            if (el.src.includes('maxresdefault')) el.src = el.src.replace('maxresdefault', 'hqdefault');
          }}
        />
      )}
      <div className="hp-hero-shade" />

      <div className="relative grid lg:grid-cols-[minmax(0,1fr)_330px] gap-6 lg:gap-8 px-5 sm:px-9 pt-28 sm:pt-40 lg:pt-44 pb-6 sm:pb-8">
        <div className="min-w-0 self-end">
          {cur ? (
            <>
              <div className="flex flex-wrap gap-2 mb-3">
                <span className="pf-badge !bg-[var(--color-accent)] text-white uppercase">{t('home2.novy_trailer', 'Nový trailer')}</span>
                {cur.hasSubtitles && <span className="ap-chip ap-glass text-white !text-[11.5px] !py-[5px] !px-2.5">{t('home2.cz_titulky', 'CZ titulky')}</span>}
                {premiereChip && <span className="ap-chip ap-glass text-white !text-[11.5px] !py-[5px] !px-2.5">{premiereChip}</span>}
              </div>
              <h1 className="font-display font-extrabold text-white text-[40px] sm:text-[60px] leading-[.98] tracking-[-0.035em] break-words">
                <Link href={`/movie/${cur.movie.slug}`} className="hover:opacity-90">
                  {cur.movie.title}
                </Link>
              </h1>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 mt-3 text-[13.5px] sm:text-[14.5px] text-white/80">
                <Score percent={cur.movie.percent} big />
                {[cur.movie.year, cur.movie.genres.join(', '), cur.movie.runtime, cur.movie.director]
                  .filter(Boolean)
                  .map((x, i) => (
                    <span key={i} className={`flex items-center gap-3 ${i === 3 ? 'hidden sm:flex' : ''}`}>
                      {i > 0 && <span className="opacity-40">&bull;</span>}
                      {x}
                    </span>
                  ))}
              </div>
              {cur.movie.synopsis && <p className="text-[14.5px] sm:text-[15.5px] leading-relaxed text-white/80 mt-3 max-w-[560px] line-clamp-2">{cur.movie.synopsis}</p>}
              <div className="flex flex-wrap items-center gap-2.5 mt-5">
                <button type="button" className="hp-play" onClick={() => play(cur)}>
                  <span className="hp-play-dot">
                    <HIcon name="play" fill className="w-3.5 h-3.5 ml-0.5" />
                  </span>
                  {t('home2.prehrat_trailer', 'Přehrát trailer')}
                </button>
                {canWatchlist && (
                  <button type="button" onClick={() => toggleWatch(cur.movie.id)} className={`ap-chip !px-4 !py-3 !text-[14px] ${watch[cur.movie.id] ? 'bg-white text-[#15171A]' : 'ap-glass text-white hover:bg-white/20'}`}>
                    <HIcon name={watch[cur.movie.id] ? 'check' : 'heart'} className="w-4 h-4" />
                    {watch[cur.movie.id] ? t('home2.v_seznamu', 'V seznamu') : t('home2.chci_videt', 'Chci vidět')}
                  </button>
                )}
                <Link href={`/movie/${cur.movie.slug}`} className="ap-chip ap-glass text-white !px-4 !py-3 !text-[14px] hover:bg-white/20 hidden sm:inline-flex">
                  {t('home2.detail_filmu', 'Detail filmu')}
                </Link>
                {cur.movie.cast.length > 0 && (
                  <span className="hidden md:flex items-center ml-3 min-w-0">
                    <span className="flex flex-none">
                      {cur.movie.cast.map((p, i) => (
                        <Link key={p.slug} href={`/osobnost/${p.slug}`} title={p.name} style={{ marginLeft: i ? -9 : 0 }}>
                          {p.photo ? <img src={p.photo} alt={p.name} className="hp-cast" /> : <span className="hp-cast block" />}
                        </Link>
                      ))}
                    </span>
                    <span className="text-[12.5px] text-white/70 ml-2.5 leading-snug line-clamp-2">{cur.movie.cast.slice(0, 2).map((p) => p.name).join(', ')}</span>
                  </span>
                )}
              </div>

              {trailers.length > 1 && (
                <div className="hp-strip mt-6">
                  {trailers.map((tr, i) => (
                    <button
                      key={tr.id}
                      type="button"
                      onClick={() => setActive(i)}
                      className={`hp-thumb ${i === active ? 'hp-thumb-on' : ''}`}
                      aria-label={tr.movie.title}
                      aria-current={i === active ? 'true' : undefined}
                    >
                      {tr.thumb ? <img src={tr.thumb} alt="" /> : <span className="block w-[58px] h-9 rounded-lg bg-white/10" />}
                      <span className="hp-thumb-text">
                        <b>{tr.movie.title}</b>
                        <span>{tr.kind}</span>
                      </span>
                      {i === active && <span key={`${tr.id}-${active}`} className={`hp-thumb-bar ${paused || playing ? 'hp-thumb-bar-paused' : ''}`} />}
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : (
            <h1 className="font-display font-extrabold text-white text-[36px] sm:text-[52px] leading-[1.02] tracking-[-0.03em]">KrálFilmu</h1>
          )}
        </div>

        <div className="hidden lg:flex flex-col gap-4 min-w-0 self-end">
          {premieres.length > 0 && (
            <div className="ap-glass rounded-[20px] p-4">
              <div className="flex items-center mb-1.5">
                <div className="ap-label !text-white/60">{t('home2.v_kinech_brzy', 'V kinech brzy')}</div>
                <Link href="/kino" className="ml-auto text-[12px] font-semibold text-white/70 hover:text-white">
                  {t('home2.kalendar', 'Kalendář')} &rarr;
                </Link>
              </div>
              {premieres.slice(0, 4).map((p, i) => {
                const d = new Date(p.date);
                return (
                  <Link key={p.id} href={`/movie/${p.slug}`} className={`flex items-center gap-3 py-2 group ${i ? 'border-t border-white/10' : ''}`}>
                    {p.poster ? <img src={p.poster} alt="" className="w-[38px] h-[57px] rounded-[7px] object-cover flex-none" /> : <span className="w-[38px] h-[57px] rounded-[7px] bg-white/10 flex-none" />}
                    <span className="min-w-0 flex-1">
                      <span className="block text-[14px] font-semibold text-white truncate group-hover:underline">{p.title}</span>
                      {p.genre && <span className="block text-[12px] text-white/60 truncate">{p.genre}</span>}
                    </span>
                    <span className="hp-cal">
                      <b>{d.toLocaleDateString('cs-CZ', { day: 'numeric', timeZone: TZ }).replace('.', '')}</b>
                      <span>{d.toLocaleDateString('cs-CZ', { month: 'short', timeZone: TZ }).replace('.', '')}</span>
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
          {contest && (
            <Link href={contest.href} className="hp-promo">
              <div className="ap-label !text-[#3A2A00]/70">{t('home2.soutez', 'Soutěž')}</div>
              <div className="font-display font-extrabold text-[19px] leading-tight mt-1">{contest.title}</div>
              <span className="inline-flex items-center gap-1 mt-2.5 text-[12.5px] font-bold text-white bg-[#2A1F00] rounded-full px-3 py-1.5">{t('home2.zapojit_se', 'Zapojit se')} &rarr;</span>
            </Link>
          )}
        </div>
      </div>

      <div className="relative hp-pulse mx-3 sm:mx-6 mb-3 sm:mb-5">
        <div>
          <b className="hp-live">{nf(pulse.ratingsToday)}</b>
          <span>{t('home2.hodnoceni_dnes', 'hodnocení dnes')}</span>
        </div>
        <div>
          <b>{nf(pulse.reviewsToday)}</b>
          <span>{t('home2.recenzi_dnes', 'nových recenzí dnes')}</span>
        </div>
        <div>
          <b>{nf(pulse.newMoviesWeek)}</b>
          <span>{t('home2.filmu_tyden', 'nových titulů za týden')}</span>
        </div>
        <div>
          <b>{nf(pulse.online)}</b>
          <span>{t('home2.online', 'lidí právě online')}</span>
        </div>
      </div>

      <LayerModal open={!!playing} onClose={close} title={playing?.movie.title || ''} subtitle={playing?.kind} closeLabel={t('person.zavriet', 'Zavřít')}>
        {playing && (
          <div className="relative aspect-video bg-black">
            <YouTubeSubtitlePlayer key={playing.id} videoId={playing.youtubeId} subtitles={playing.subtitles} title={playing.title} fill autoPlay />
          </div>
        )}
      </LayerModal>
    </section>
  );
}
