import Link from 'next/link';
import type { Metadata } from 'next';
import { getWeekendBoxOffice } from '@/lib/weekendBoxOffice';
import { getDictionary, getUserLanguage } from '@/lib/i18n';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'Top 10 box office (USA) — víkendové tržby' };

function weekendLabel(startIso: string, endIso: string) {
  const s = new Date(startIso);
  const e = new Date(endIso);
  return s.getMonth() === e.getMonth()
    ? `${s.getDate()}.–${e.getDate()}. ${e.getMonth() + 1}. ${e.getFullYear()}`
    : `${s.getDate()}. ${s.getMonth() + 1}. – ${e.getDate()}. ${e.getMonth() + 1}. ${e.getFullYear()}`;
}

function percentClass(p: number) {
  if (p < 20) return 'bg-[#15171A]';
  if (p < 70) return 'bg-[#2563EB]';
  return 'bg-[#059669]';
}

// Samostatný rebríček víkendových tržieb v USA (top 10) — dáta z GitHub bota,
// rovnaké ako box na hlavnej stránke (cachované 10 h, lib/weekendBoxOffice.ts).
export default async function UsaBoxOfficePage() {
  const [dict, data] = await Promise.all([getUserLanguage().then((l) => getDictionary(l)), getWeekendBoxOffice()]);
  const t = (key: string) => dict[key] || key;
  const entries = data?.entries || [];
  const max = Math.max(1, ...entries.map((e) => e.grossValue || 0));
  const hasTotals = entries.some((e) => e.totalLabel);
  const hasWeeks = entries.some((e) => e.weeks);

  return (
    <div className="pt-8 max-w-4xl">
      <div className="flex items-end justify-between gap-4 mb-2">
        <h1 className="font-display font-extrabold text-3xl text-ink">{t('boxoffice_usa.nadpis')}</h1>
        <Link href="/box-office" className="text-xs font-semibold text-accent hover:underline whitespace-nowrap">
          {t('boxoffice_usa.box_office_link')} →
        </Link>
      </div>
      <p className="text-muted mb-1">{t('boxoffice_usa.popis')}</p>
      {data && (
        <p className="text-sm font-semibold text-ink mb-6">
          {t('boxoffice_vikend.vikend')} {weekendLabel(data.weekendStart, data.weekendEnd)}
        </p>
      )}

      {entries.length === 0 ? (
        <p className="mt-8 text-muted border border-line rounded-xl p-6 bg-card">{t('boxoffice_usa.ziadne_data')}</p>
      ) : (
        <ol className="mt-6 border border-line rounded-xl bg-card divide-y divide-line overflow-hidden">
          {entries.map((e, i) => {
            const href = e.movie ? `/movie/${e.movie.slug}` : null;
            const Poster = e.poster ? (
              <img src={e.poster} alt="" className="w-12 h-[72px] sm:w-14 sm:h-20 rounded-md object-cover bg-surface" />
            ) : (
              <div className="w-12 h-[72px] sm:w-14 sm:h-20 rounded-md bg-surface" />
            );
            return (
              <li key={`${e.rank}-${e.originalTitle}`} className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 hover:bg-surface/60 transition-colors">
                <span className={`w-7 text-center font-display font-extrabold flex-none ${i < 3 ? 'text-2xl text-ink' : 'text-lg text-muted'}`}>{e.rank}</span>
                {href ? (
                  <Link href={href} className="flex-none">
                    {Poster}
                  </Link>
                ) : (
                  <div className="flex-none">{Poster}</div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    {href ? (
                      <Link href={href} className="font-display font-bold text-ink hover:text-accent truncate">
                        {e.title}
                      </Link>
                    ) : (
                      <span className="font-display font-bold text-ink truncate">{e.title}</span>
                    )}
                    {e.isReRelease && (
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800">
                        {t('boxoffice_vikend.znovuuvedenie')}
                      </span>
                    )}
                    {e.movie?.percent !== null && e.movie?.percent !== undefined && (
                      <span className={`text-[11px] font-bold text-white rounded-full px-2 py-0.5 ${percentClass(e.movie.percent)}`}>{e.movie.percent} %</span>
                    )}
                  </div>
                  {e.originalTitle !== e.title && <div className="text-xs text-muted truncate">{e.originalTitle}</div>}
                  {e.grossValue ? (
                    <div className="h-1.5 rounded-full bg-line mt-2 overflow-hidden max-w-md">
                      <div className="h-full rounded-full bg-accent" style={{ width: `${Math.max(2, (e.grossValue / max) * 100)}%` }} />
                    </div>
                  ) : null}
                  {/* Na mobile sú čísla pod názvom */}
                  <div className="sm:hidden text-xs text-muted mt-1.5 flex gap-3 tabular-nums">
                    {e.grossLabel && (
                      <span>
                        <b className="text-ink">{e.grossLabel}</b>
                      </span>
                    )}
                    {e.totalLabel && (
                      <span>
                        {t('boxoffice_vikend.celkom')} {e.totalLabel}
                      </span>
                    )}
                    {e.weeks && (
                      <span>
                        {e.weeks} {t('boxoffice_usa.tyzdne')}
                      </span>
                    )}
                  </div>
                </div>
                {/* Na počítači sú čísla v stĺpcoch vpravo */}
                <div className="hidden sm:grid grid-cols-3 gap-4 text-right tabular-nums flex-none w-72">
                  <div>
                    <div className="text-[10px] uppercase tracking-wide text-muted">{t('boxoffice_usa.vikend')}</div>
                    <div className={`text-sm ${i === 0 ? 'font-extrabold text-ink' : 'font-semibold text-ink'}`}>{e.grossLabel || '—'}</div>
                  </div>
                  <div>
                    {hasTotals && (
                      <>
                        <div className="text-[10px] uppercase tracking-wide text-muted">{t('boxoffice_vikend.celkom')}</div>
                        <div className="text-sm text-ink">{e.totalLabel || '—'}</div>
                      </>
                    )}
                  </div>
                  <div>
                    {hasWeeks && (
                      <>
                        <div className="text-[10px] uppercase tracking-wide text-muted">{t('boxoffice_usa.tyzdne')}</div>
                        <div className="text-sm text-ink">{e.weeks || '—'}</div>
                      </>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      <div className="mt-4 text-xs text-muted">
        <span>
          {t('boxoffice_usa.zdroj')}: {data?.source === 'boxofficemojo' ? 'Box Office Mojo' : 'IMDb'}
          {data?.updatedAt && (
            <>
              {' '}
              · {t('boxoffice_usa.aktualizovane')} {new Date(data.updatedAt).toLocaleDateString('cs-CZ')}
            </>
          )}
        </span>
      </div>
    </div>
  );
}
