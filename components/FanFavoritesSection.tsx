'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { IconCheck, IconPlus } from './Icons';
import { useT } from './TranslationProvider';

type Item = {
  rank: number;
  id: string;
  slug: string;
  title: string;
  year: string | null;
  poster: string | null;
  percent: number | null;
  trailerId: string | null;
  inWatchlist: boolean;
  myRating: number;
  contentType?: string;
};

export const FAN_PAGE_PATH = '/oblibene-fanousci';

const STAR = 'M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6L2.5 9.4l6.6-.8z';

function Star({ className = 'w-4 h-4', filled = false, half = false }: { className?: string; filled?: boolean; half?: boolean }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path d={STAR} fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      {half && (
        <path d={STAR} fill="currentColor" style={{ clipPath: 'inset(0 50% 0 0)' }} />
      )}
    </svg>
  );
}

const fmt = (v: number) => String(v).replace('.', ',');

// Oblíbené mezi fanoušky — vodorovne posúvateľný rad na hlavnej stránke.
// Karta: plagát s pluskom (Chci vidět), naše hodnotenie, modrá hviezda na
// rýchle ohodnotenie (5 hviezd s polovicami), názov, Chci vidět, Trailer.
export default function FanFavoritesSection({ initialItems, layout = 'row' }: { initialItems: Item[]; layout?: 'row' | 'grid' }) {
  const t = useT();
  const [items, setItems] = useState<Item[]>(initialItems);
  const [rateFor, setRateFor] = useState<Item | null>(null);
  const [trailerFor, setTrailerFor] = useState<Item | null>(null);
  const rowRef = useRef<HTMLDivElement>(null);

  if (items.length === 0) return null;
  const grid = layout === 'grid';

  const update = (id: string, patch: Partial<Item>) => setItems((list) => list.map((m) => (m.id === id ? { ...m, ...patch } : m)));

  async function toggleWatchlist(m: Item) {
    update(m.id, { inWatchlist: !m.inWatchlist });
    try {
      const res = await fetch('/api/watchlist', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ movieId: m.id }) });
      const data = await res.json();
      if (!res.ok) throw new Error();
      update(m.id, { inWatchlist: !!data.inWatchlist });
    } catch {
      update(m.id, { inWatchlist: m.inWatchlist });
    }
  }

  const scroll = (dir: 1 | -1) => rowRef.current?.scrollBy({ left: dir * rowRef.current.clientWidth * 0.85, behavior: 'smooth' });
  const watchLabel = (m: Item) => (m.inWatchlist ? t('home.odobrat_chcem_vidiet', 'Odebrat z Chci vidět') : t('home.pridat_chcem_vidiet', 'Přidat do Chci vidět'));

  return (
    <section aria-labelledby={grid ? undefined : 'oblibene-fanousci'} aria-label={grid ? t('home.oblubene_fanusikovia', 'Oblíbené mezi fanoušky') : undefined}>
      {!grid && (
      <div className="flex items-end justify-between gap-4 mb-4">
        <div>
          <Link href={FAN_PAGE_PATH} className="group inline-flex items-center gap-2">
            <span className="w-1 h-6 rounded-full bg-[#f5c518]" aria-hidden="true" />
            <h2 id="oblibene-fanousci" className="font-display font-extrabold text-xl text-ink group-hover:text-accent transition-colors">{t('home.oblubene_fanusikovia', 'Oblíbené mezi fanoušky')}</h2>
            <svg className="w-6 h-6 text-ink group-hover:text-accent group-hover:translate-x-0.5 transition-all" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>
            <span className="sr-only">{t('fans.zobrazit_vsetky', 'Zobrazit všechny')}</span>
          </Link>
          <p className="text-xs text-muted mt-0.5 pl-3">{t('home.oblubene_popis', 'Co tento týden nejvíc zajímá diváky')}</p>
        </div>
        <div className="hidden sm:flex gap-2">
          <button type="button" onClick={() => scroll(-1)} aria-label={t('home.posunut_vlavo', 'Posunout doleva')} className="w-10 h-10 rounded-full border border-line bg-card text-ink hover:border-accent flex items-center justify-center">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M15 6l-6 6 6 6" /></svg>
          </button>
          <button type="button" onClick={() => scroll(1)} aria-label={t('home.posunut_vpravo', 'Posunout doprava')} className="w-10 h-10 rounded-full border border-line bg-card text-ink hover:border-accent flex items-center justify-center">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M9 6l6 6-6 6" /></svg>
          </button>
        </div>
      </div>
      )}

      <div
        ref={rowRef}
        className={grid ? 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-x-4 gap-y-6' : 'flex gap-4 overflow-x-auto snap-x snap-mandatory pb-2 -mx-1 px-1 [scrollbar-width:none]'}
      >
        {items.map((m) => (
          <article
            key={m.id}
            className={`${grid ? '' : 'flex-none w-[150px] sm:w-[172px] lg:w-[calc((100%-80px)/6)] snap-start '}rounded-xl border border-line bg-card overflow-hidden flex flex-col`}
          >
            <div className="relative">
              {grid && (
                <span className="absolute top-2 right-2 z-[1] rounded-md bg-black/70 text-white text-xs font-bold px-2 py-0.5 tabular-nums">#{m.rank}</span>
              )}
              <Link href={`/movie/${m.slug}`} className="block aspect-[2/3] bg-surface bg-cover bg-center" style={m.poster ? { backgroundImage: `url('${m.poster}')` } : undefined} aria-label={m.title} />
              <button
                type="button"
                onClick={() => toggleWatchlist(m)}
                aria-label={watchLabel(m)}
                title={watchLabel(m)}
                className={`absolute top-0 left-0 w-9 h-10 flex items-start justify-center pt-2 text-white transition-colors ${m.inWatchlist ? 'bg-accent' : 'bg-black/60 hover:bg-black/80'}`}
                style={{ clipPath: 'polygon(0 0,100% 0,100% 100%,50% 82%,0 100%)' }}
              >
                {m.inWatchlist ? <IconCheck className="w-4 h-4" /> : <IconPlus className="w-4 h-4" />}
              </button>
            </div>

            <div className="p-3 flex flex-col gap-2 flex-1">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1 text-sm text-ink">
                  <Star className="w-4 h-4 text-[#f5c518]" filled />
                  {m.percent !== null ? `${m.percent} %` : '–'}
                </span>
                <button
                  type="button"
                  onClick={() => setRateFor(m)}
                  aria-label={t('home.ohodnotit_film', 'Ohodnotit film')}
                  className="flex items-center gap-1 text-sm text-accent hover:opacity-80"
                >
                  <Star className="w-[18px] h-[18px]" filled={m.myRating > 0} />
                  {m.myRating > 0 && <span className="font-semibold">{fmt(m.myRating)}</span>}
                </button>
              </div>
              <Link href={`/movie/${m.slug}`} className="text-sm font-semibold text-ink leading-snug line-clamp-2 min-h-[2.5rem] hover:text-accent">
                {m.title}
              </Link>
              <div className="mt-auto flex flex-col gap-1">
                <button
                  type="button"
                  onClick={() => toggleWatchlist(m)}
                  className={`h-8 rounded-full text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                    m.inWatchlist ? 'bg-accent text-white' : 'bg-surface text-accent hover:bg-line'
                  }`}
                >
                  {m.inWatchlist ? <IconCheck className="w-3.5 h-3.5" /> : <IconPlus className="w-3.5 h-3.5" />}
                  {t('movie.chcem_vidiet', 'Chci vidět')}
                </button>
                {m.trailerId ? (
                  <button type="button" onClick={() => setTrailerFor(m)} className="h-8 rounded-full text-xs font-semibold text-ink hover:bg-surface flex items-center justify-center gap-1.5">
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 4v16l13-8z" /></svg>
                    {t('home.trailer', 'Trailer')}
                  </button>
                ) : (
                  <div className="h-8" />
                )}
              </div>
            </div>
          </article>
        ))}
      </div>

      {rateFor && (
        <RateDialog
          item={rateFor}
          onClose={() => setRateFor(null)}
          onSaved={(value) => {
            update(rateFor.id, { myRating: value });
            setRateFor(null);
          }}
        />
      )}

      {trailerFor && trailerFor.trailerId && (
        <Overlay onClose={() => setTrailerFor(null)} label={trailerFor.title}>
          <div className="w-full max-w-4xl">
            <div className="flex justify-end mb-2">
              <CloseButton onClick={() => setTrailerFor(null)} />
            </div>
            <div className="aspect-video rounded-xl overflow-hidden bg-black">
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${trailerFor.trailerId}?autoplay=1&rel=0`}
                title={trailerFor.title}
                allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                allowFullScreen
                className="w-full h-full"
              />
            </div>
          </div>
        </Overlay>
      )}
    </section>
  );
}

function CloseButton({ onClick }: { onClick: () => void }) {
  const t = useT();
  return (
    <button type="button" onClick={onClick} aria-label={t('home.zavriet', 'Zavřít')} className="w-10 h-10 rounded-full text-white hover:bg-white/10 flex items-center justify-center">
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
    </button>
  );
}

function Overlay({ children, onClose, label, sheet = false }: { children: React.ReactNode; onClose: () => void; label: string; sheet?: boolean }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={label}
      className={`fixed inset-0 z-50 bg-black/75 flex justify-center p-0 sm:p-6 ${sheet ? 'items-end sm:items-center' : 'items-center p-4'}`}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {children}
    </div>
  );
}

function RateDialog({ item, onClose, onSaved }: { item: Item; onClose: () => void; onSaved: (value: number) => void }) {
  const t = useT();
  const [value, setValue] = useState(item.myRating);
  const [hover, setHover] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);
  const display = hover ?? value;

  const pick = (e: React.MouseEvent<HTMLButtonElement>, i: number) => {
    const r = e.currentTarget.getBoundingClientRect();
    return i + (e.clientX - r.left < r.width / 2 ? 0.5 : 1);
  };

  async function save() {
    if (!value) return;
    setSaving(true);
    setError(false);
    try {
      const res = await fetch('/api/ratings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ movieId: item.id, value }) });
      if (!res.ok) throw new Error();
      onSaved(value);
    } catch {
      setError(true);
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    setSaving(true);
    setError(false);
    try {
      const res = await fetch('/api/ratings', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ movieId: item.id }) });
      if (!res.ok) throw new Error();
      onSaved(0);
    } catch {
      setError(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Overlay onClose={onClose} label={item.title} sheet>
      <div className="relative w-full sm:max-w-md bg-card border border-line rounded-t-2xl sm:rounded-2xl px-6 pt-20 pb-8 text-center mt-16">
        <div className="absolute left-1/2 -top-14 -translate-x-1/2 w-28 h-28 text-accent">
          <Star className="w-28 h-28" filled />
          <span className="absolute inset-0 flex items-center justify-center pt-2 text-2xl font-extrabold text-white">{display ? fmt(display) : '?'}</span>
        </div>
        <div className="absolute right-3 top-3 text-ink">
          <button type="button" onClick={onClose} aria-label={t('home.zavriet', 'Zavřít')} className="w-10 h-10 rounded-full hover:bg-surface flex items-center justify-center">
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>
        <div className="text-xs font-extrabold tracking-[0.2em] uppercase text-[#d9a400]">{t('home.ohodnot', 'Ohodnoť')}</div>
        <div className="font-display text-2xl font-bold text-ink mt-2">{item.title}</div>

        <div className="flex justify-center gap-2 mt-6" onMouseLeave={() => setHover(null)}>
          {[0, 1, 2, 3, 4].map((i) => (
            <button
              key={i}
              type="button"
              aria-label={`${i + 1} / 5`}
              onMouseMove={(e) => setHover(pick(e, i))}
              onClick={(e) => setValue(pick(e, i))}
              className="w-11 h-11 text-[#f5c518]"
            >
              <Star className={`w-11 h-11 ${display >= i + 0.5 ? '' : 'text-muted'}`} filled={display >= i + 1} half={display >= i + 0.5 && display < i + 1} />
            </button>
          ))}
        </div>
        <div className="text-xs text-muted mt-2 min-h-[1rem]">
          {display ? `${fmt(display)} ${t('home.z_5', 'z 5')}` : t('home.hodnotenie_napoveda', 'Polovinu hvězdy získáš kliknutím na její levou část')}
        </div>
        {error && <div className="text-xs text-red-500 mt-2">{t('home.hodnotenie_chyba', 'Hodnocení se nepodařilo uložit.')}</div>}

        <button
          type="button"
          onClick={save}
          disabled={!value || saving}
          className="mt-6 w-full h-12 rounded-full font-bold text-sm bg-[#f5c518] text-[#111] disabled:bg-surface disabled:text-muted transition-colors"
        >
          {t('home.ulozit_hodnotenie', 'Uložit hodnocení')}
        </button>
        <div className="flex justify-center gap-5 mt-4 text-xs font-semibold">
          <Link href={`/movie/${item.slug}`} className="text-accent hover:underline">{t('home.napisat_recenziu', 'Napsat recenzi')}</Link>
          {item.myRating > 0 && (
            <button type="button" onClick={remove} disabled={saving} className="text-muted hover:text-ink">{t('home.odstranit_hodnotenie', 'Odstranit hodnocení')}</button>
          )}
        </div>
      </div>
    </Overlay>
  );
}
