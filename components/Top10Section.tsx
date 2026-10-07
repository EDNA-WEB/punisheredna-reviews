'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { IconCheck, IconPlus } from './Icons';
import { useT } from './TranslationProvider';
import { top10Meta } from '@/lib/top10Meta';

type Item = {
  rank: number;
  id: string;
  slug: string;
  title: string;
  poster: string | null;
  contentType: string;
  year: string | null;
  releaseDate: string | null;
  runtime: number | null;
  episodes: number;
  ageRating: string | null;
  synopsis: string | null;
  percent: number | null;
  inWatchlist: boolean;
  myRating: number;
  seen: boolean;
};

const STAR = 'M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6L2.5 9.4l6.6-.8z';
const fmt = (v: number) => String(v).replace('.', ',');

function Star({ className = 'w-4 h-4', filled = false, half = false }: { className?: string; filled?: boolean; half?: boolean }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path d={STAR} fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round" />
      {half && <path d={STAR} fill="currentColor" style={{ clipPath: 'inset(0 50% 0 0)' }} />}
    </svg>
  );
}
function Eye({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
function Rank({ n, small = false }: { n: number; small?: boolean }) {
  return (
    <span
      className={`inline-block self-start bg-accent text-white font-extrabold tabular-nums ${small ? 'text-xs pl-2 pr-3 py-0.5' : 'text-sm pl-2 pr-4 py-0.5'}`}
      style={{ clipPath: 'polygon(0 0,100% 0,85% 100%,0 100%)' }}
    >
      #{n}
    </span>
  );
}

// Top 10 tento týden. layout="home": #1–#3 veľké karty, #4–#10 rad plagátov;
// layout="list": všetkých 10 ako veľké karty pod sebou (stránka /top-10).
export default function Top10Section({ initialItems, layout = 'home' }: { initialItems: Item[]; layout?: 'home' | 'list' }) {
  const t = useT();
  const [items, setItems] = useState(initialItems);
  const [rateFor, setRateFor] = useState<Item | null>(null);
  if (!items.length) return null;
  const patch = (id: string, p: Partial<Item>) => setItems((l) => l.map((m) => (m.id === id ? { ...m, ...p } : m)));

  async function toggleWatchlist(m: Item) {
    patch(m.id, { inWatchlist: !m.inWatchlist });
    try {
      const res = await fetch('/api/watchlist', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ movieId: m.id }) });
      const d = await res.json();
      if (!res.ok) throw new Error();
      patch(m.id, { inWatchlist: !!d.inWatchlist });
    } catch {
      patch(m.id, { inWatchlist: m.inWatchlist });
    }
  }

  async function toggleSeen(m: Item) {
    if (m.myRating > 0) return; // ohodnotený film je viděný automaticky
    patch(m.id, { seen: !m.seen });
    try {
      const res = await fetch('/api/seen-movie', { method: m.seen ? 'DELETE' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ movieId: m.id }) });
      if (!res.ok) throw new Error();
    } catch {
      patch(m.id, { seen: m.seen });
    }
  }

  const big = layout === 'list' ? items : items.slice(0, 3);
  const rest = layout === 'list' ? [] : items.slice(3);

  const Card = ({ m, highlight }: { m: Item; highlight: boolean }) => (
    <article
      className={`rounded-xl border border-line p-3 flex gap-3 xl:gap-4 min-w-0 overflow-hidden h-[182px] lg:h-[236px] xl:h-[251px] ${highlight ? 'bg-gradient-to-b from-accent/15 to-card' : 'bg-card'} ${
        layout === 'home' ? 'flex-none w-[300px] md:w-auto snap-start' : ''
      }`}
    >
      <div className="relative flex-none w-[104px] lg:w-[140px] xl:w-[150px]">
        <Link href={`/movie/${m.slug}`} className="block aspect-[2/3] rounded-lg bg-surface bg-cover bg-center" style={m.poster ? { backgroundImage: `url('${m.poster}')` } : undefined} aria-label={m.title} />
        <button
          type="button"
          onClick={() => toggleWatchlist(m)}
          aria-label={m.inWatchlist ? t('home.odobrat_chcem_vidiet', 'Odebrat z Chci vidět') : t('home.pridat_chcem_vidiet', 'Přidat do Chci vidět')}
          title={m.inWatchlist ? t('home.odobrat_chcem_vidiet', 'Odebrat z Chci vidět') : t('home.pridat_chcem_vidiet', 'Přidat do Chci vidět')}
          className={`absolute top-0 left-0 w-9 h-10 flex items-start justify-center pt-2 text-white rounded-tl-lg ${m.inWatchlist ? 'bg-accent' : 'bg-black/60 hover:bg-black/80'}`}
          style={{ clipPath: 'polygon(0 0,100% 0,100% 100%,50% 82%,0 100%)' }}
        >
          {m.inWatchlist ? <IconCheck className="w-4 h-4" /> : <IconPlus className="w-4 h-4" />}
        </button>
      </div>
      <div className="min-w-0 flex-1 flex flex-col gap-1 lg:gap-1.5 overflow-hidden">
        <Rank n={m.rank} />
        <Link href={`/movie/${m.slug}`} className="font-display font-bold text-ink leading-snug line-clamp-2 md:line-clamp-1 lg:line-clamp-2 hover:text-accent">
          {m.title}
        </Link>
        <div className="text-xs text-muted leading-relaxed truncate">{top10Meta(m)}</div>
        <div className="flex items-center gap-4 text-sm">
          <span className="flex items-center gap-1 text-ink">
            <Star className="w-4 h-4 text-[#f5c518]" filled />
            {m.percent !== null ? `${m.percent} %` : '–'}
          </span>
          <button type="button" onClick={() => setRateFor(m)} className="flex items-center gap-1 font-semibold text-accent hover:opacity-80">
            <Star className="w-4 h-4" filled={m.myRating > 0} />
            {m.myRating > 0 ? fmt(m.myRating) : t('top10.ohodnotit', 'Ohodnotit')}
          </button>
        </div>
        <button
          type="button"
          onClick={() => toggleSeen(m)}
          className={`flex items-center gap-1.5 text-sm font-semibold self-start ${m.seen ? 'text-emerald-500' : 'text-accent hover:opacity-80'}`}
          title={m.myRating > 0 ? t('top10.videny_hodnotenim', 'Ohodnocený film je označený jako viděný') : undefined}
        >
          {m.seen ? <IconCheck className="w-4 h-4" /> : <Eye />}
          {m.seen ? t('top10.videl', 'Viděno') : t('top10.videl_som', 'Viděl jsem')}
        </button>
        {m.synopsis && <p className="hidden lg:block text-xs text-muted leading-relaxed lg:line-clamp-2 xl:line-clamp-3">{m.synopsis}</p>}
      </div>
    </article>
  );

  return (
    <section aria-labelledby={layout === 'home' ? 'top10-nadpis' : undefined}>
      {layout === 'home' && (
        <div className="mb-4">
        <Link href="/top-10" className="group inline-flex items-center gap-2">
          <span className="w-1 h-6 rounded-full bg-[#f5c518]" aria-hidden="true" />
          <h2 id="top10-nadpis" className="font-display font-extrabold text-xl text-ink group-hover:text-accent transition-colors">
            {t('top10.nadpis', 'Top 10 tento týden')}
          </h2>
          <svg className="w-6 h-6 text-ink group-hover:text-accent group-hover:translate-x-0.5 transition-all" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true">
            <path d="M9 6l6 6-6 6" />
          </svg>
        </Link>
        <p className="text-xs text-muted mt-0.5 pl-3">{t('top10.popis_home', 'Nejsledovanější filmy a seriály tohoto týdne')}</p>
        </div>
      )}

      {/* Počítač: horný rad 3 filmy, spodný 7 filmov + šípka na celý zoznam. Mobil: rady sa posúvajú prstom. */}
      <div className={layout === 'home' ? 'flex gap-4 overflow-x-auto snap-x snap-mandatory pb-1 md:grid md:grid-cols-3 md:overflow-visible md:pb-0 [scrollbar-width:none]' : 'grid md:grid-cols-2 gap-4'}>
        {big.map((m, i) => (
          <Card key={m.id} m={m} highlight={i === 0} />
        ))}
      </div>

      {rest.length > 0 && (
        <div className="flex gap-3 xl:gap-4 overflow-x-auto snap-x pb-1 mt-4 md:grid md:grid-cols-7 md:overflow-visible md:pb-0 [scrollbar-width:none]">
          {rest.map((m) => (
            <Link key={m.id} href={`/movie/${m.slug}`} className="group flex-none w-[118px] md:w-auto snap-start rounded-xl border border-line bg-card overflow-hidden">
              <div className="relative aspect-[2/3] bg-surface bg-cover bg-center" style={m.poster ? { backgroundImage: `url('${m.poster}')` } : undefined}>
                <span className="absolute top-0 left-0">
                  <Rank n={m.rank} small />
                </span>
              </div>
              <div className="px-2.5 py-2">
                <div className="text-sm font-semibold text-ink truncate group-hover:text-accent">{m.title}</div>
                <div className="flex items-center gap-1 text-xs text-muted mt-0.5">
                  <Star className="w-3 h-3 text-[#f5c518]" filled />
                  {m.percent !== null ? `${m.percent} %` : '–'}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {rateFor && (
        <RateDialog
          item={rateFor}
          onClose={() => setRateFor(null)}
          onSaved={(v) => {
            patch(rateFor.id, { myRating: v, seen: v > 0 ? true : rateFor.seen });
            setRateFor(null);
          }}
        />
      )}
    </section>
  );
}

function RateDialog({ item, onClose, onSaved }: { item: Item; onClose: () => void; onSaved: (v: number) => void }) {
  const t = useT();
  const [value, setValue] = useState(item.myRating);
  const [hover, setHover] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);
  const display = hover ?? value;
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    boxRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const pick = (e: React.MouseEvent<HTMLButtonElement>, i: number) => {
    const r = e.currentTarget.getBoundingClientRect();
    return i + (e.clientX - r.left < r.width / 2 ? 0.5 : 1);
  };

  async function send(v: number) {
    setSaving(true);
    setError(false);
    try {
      const res = await fetch('/api/ratings', {
        method: v ? 'POST' : 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(v ? { movieId: item.id, value: v } : { movieId: item.id })
      });
      if (!res.ok) throw new Error();
      onSaved(v);
    } catch {
      setError(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div role="dialog" aria-modal="true" aria-label={item.title} className="fixed inset-0 z-50 bg-black/75 flex items-end sm:items-center justify-center sm:p-6" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={boxRef} tabIndex={-1} className="relative w-full sm:max-w-md bg-card border border-line rounded-t-2xl sm:rounded-2xl px-6 pt-20 pb-8 text-center mt-16 outline-none">
        <div className="absolute left-1/2 -top-14 -translate-x-1/2 w-28 h-28 text-accent">
          <Star className="w-28 h-28" filled />
          <span className="absolute inset-0 flex items-center justify-center pt-2 text-2xl font-extrabold text-white">{display ? fmt(display) : '?'}</span>
        </div>
        <button type="button" onClick={onClose} aria-label={t('home.zavriet', 'Zavřít')} className="absolute right-3 top-3 w-10 h-10 rounded-full text-ink hover:bg-surface flex items-center justify-center">
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>
        <div className="text-xs font-extrabold tracking-[0.2em] uppercase text-[#d9a400]">{t('home.ohodnot', 'Ohodnoť')}</div>
        <div className="font-display text-2xl font-bold text-ink mt-2">{item.title}</div>
        <div className="flex justify-center gap-2 mt-6" onMouseLeave={() => setHover(null)}>
          {[0, 1, 2, 3, 4].map((i) => (
            <button key={i} type="button" aria-label={`${i + 1} / 5`} onMouseMove={(e) => setHover(pick(e, i))} onClick={(e) => setValue(pick(e, i))} className="w-11 h-11 text-[#f5c518]">
              <Star className={`w-11 h-11 ${display >= i + 0.5 ? '' : 'text-muted'}`} filled={display >= i + 1} half={display >= i + 0.5 && display < i + 1} />
            </button>
          ))}
        </div>
        <div className="text-xs text-muted mt-2 min-h-[1rem]">
          {display ? `${fmt(display)} ${t('home.z_5', 'z 5')}` : t('home.hodnotenie_napoveda', 'Polovinu hvězdy získáš kliknutím na její levou část')}
        </div>
        {error && <div className="text-xs text-red-500 mt-2">{t('home.hodnotenie_chyba', 'Hodnocení se nepodařilo uložit.')}</div>}
        <button type="button" onClick={() => send(value)} disabled={!value || saving} className="mt-6 w-full h-12 rounded-full font-bold text-sm bg-[#f5c518] text-[#111] disabled:bg-surface disabled:text-muted">
          {t('home.ulozit_hodnotenie', 'Uložit hodnocení')}
        </button>
        <div className="flex justify-center gap-5 mt-4 text-xs font-semibold">
          <Link href={`/movie/${item.slug}`} className="text-accent hover:underline">{t('home.napisat_recenziu', 'Napsat recenzi')}</Link>
          {item.myRating > 0 && (
            <button type="button" onClick={() => send(0)} disabled={saving} className="text-muted hover:text-ink">{t('home.odstranit_hodnotenie', 'Odstranit hodnocení')}</button>
          )}
        </div>
      </div>
    </div>
  );
}
