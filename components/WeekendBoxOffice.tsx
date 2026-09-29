import Link from 'next/link';
import type { WeekendBoxOffice as Data, BoxOfficeEntry } from '@/lib/weekendBoxOffice';

// Box "Top box office (USA)" na hlavnej stránke — v rovnakom štýle ako ostatné
// sekcie webu (karta s nadpisom a tlačidlom "viac", riadky ako MovieMiniList).
// Počítač: celá desiatka v dvoch stĺpcoch. Mobil: prvých 6 v jednom stĺpci.
// Celý rebríček je na samostatnej stránke /box-office/usa.

type T = (key: string) => string;
const MOBILE_LIMIT = 6;

export function weekendLabel(startIso: string, endIso: string) {
  const s = new Date(startIso);
  const e = new Date(endIso);
  return s.getMonth() === e.getMonth()
    ? `${s.getDate()}.–${e.getDate()}. ${e.getMonth() + 1}.`
    : `${s.getDate()}. ${s.getMonth() + 1}. – ${e.getDate()}. ${e.getMonth() + 1}.`;
}

function Row({ e, t, className = '' }: { e: BoxOfficeEntry; t: T; className?: string }) {
  const inner = (
    <>
      <span className="w-5 text-center font-display font-bold text-sm text-muted flex-none tabular-nums">{e.rank}</span>
      <div className="relative w-9 h-12 rounded-md overflow-hidden bg-surface flex-none shadow-sm">
        {e.poster && (
          <div
            className="absolute inset-0 bg-cover bg-center transition-transform duration-300 group-hover:scale-105"
            style={{ backgroundImage: `url('${e.poster}')` }}
          />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className={`text-sm font-semibold text-ink truncate ${e.movie ? 'group-hover:text-accent transition-colors' : ''}`}>
          {e.title} {e.movie?.year && <span className="text-muted font-normal">· {e.movie.year}</span>}
        </div>
        <div className="flex items-center gap-1.5 mt-1">
          {e.grossLabel && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-accent/10 text-accent tabular-nums">{e.grossLabel}</span>}
          {e.isReRelease && (
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800">{t('boxoffice_vikend.znovuuvedenie')}</span>
          )}
        </div>
      </div>
    </>
  );
  const cls = `flex items-center gap-3 group rounded-lg p-1.5 -mx-1.5 hover:bg-surface transition-colors ${className}`;
  return e.movie ? (
    <Link href={`/movie/${e.movie.slug}`} className={cls}>
      {inner}
    </Link>
  ) : (
    <div className={cls}>{inner}</div>
  );
}

export default function WeekendBoxOffice({ data, t }: { data: Data; t: T }) {
  if (!data || data.entries.length === 0) return null;
  const left = data.entries.slice(0, 5);
  const right = data.entries.slice(5, 10);

  return (
    <div className="mt-8 border border-line rounded-xl bg-card p-4 sm:p-5 min-w-0">
      <div className="flex items-center justify-between mb-4 gap-3">
        <div className="min-w-0">
          <h2 className="font-display font-bold text-base text-ink">{t('boxoffice_vikend.nadpis')}</h2>
          <p className="text-[11px] text-muted mt-0.5">
            {t('boxoffice_vikend.vikend')} {weekendLabel(data.weekendStart, data.weekendEnd)}
          </p>
        </div>
        <Link href="/box-office/usa" className="text-[11px] font-semibold text-white bg-accent px-2.5 py-1 rounded-full hover:bg-accent-dark flex-none">
          {t('boxoffice_vikend.viac')}
        </Link>
      </div>

      {/* Mobil: prvých 6 */}
      <div className="sm:hidden space-y-1">
        {data.entries.slice(0, MOBILE_LIMIT).map((e) => (
          <Row key={`m-${e.rank}`} e={e} t={t} />
        ))}
      </div>

      {/* Počítač / tablet: 1–5 a 6–10 vedľa seba */}
      <div className="hidden sm:grid grid-cols-2 gap-x-6">
        <div className="space-y-1">
          {left.map((e) => (
            <Row key={`l-${e.rank}`} e={e} t={t} />
          ))}
        </div>
        <div className="space-y-1">
          {right.map((e) => (
            <Row key={`r-${e.rank}`} e={e} t={t} />
          ))}
        </div>
      </div>
    </div>
  );
}
