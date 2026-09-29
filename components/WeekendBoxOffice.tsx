import Link from 'next/link';
import type { WeekendBoxOffice as Data } from '@/lib/weekendBoxOffice';

// Box "Top box office (USA)" na hlavnej stránke — na počítači zvýraznený
// film č. 1 vľavo a rebríček s pruhmi vpravo, na mobile číslovaný zoznam.
// Texty prichádzajú cez t() (Administrácia → Preklad, skupina "Box Office").

type T = (key: string) => string;

function formatRuntime(min: number | null) {
  if (!min) return null;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h ? `${h} h ${m} min` : `${m} min`;
}

function weekendLabel(startIso: string, endIso: string) {
  const s = new Date(startIso);
  const e = new Date(endIso);
  const sameMonth = s.getMonth() === e.getMonth();
  return sameMonth ? `${s.getDate()}.–${e.getDate()}. ${e.getMonth() + 1}. ${e.getFullYear()}` : `${s.getDate()}. ${s.getMonth() + 1}. – ${e.getDate()}. ${e.getMonth() + 1}. ${e.getFullYear()}`;
}

function PeopleLinks({ people }: { people: { name: string; slug: string | null }[] }) {
  return (
    <span>
      {people.map((p, i) => (
        <span key={p.name}>
          {i > 0 && <span className="text-muted"> · </span>}
          {p.slug ? (
            <Link href={`/osobnost/${p.slug}`} className="text-accent hover:underline">
              {p.name}
            </Link>
          ) : (
            <span className="text-ink">{p.name}</span>
          )}
        </span>
      ))}
    </span>
  );
}

export default function WeekendBoxOffice({ data, t }: { data: Data; t: T }) {
  if (!data || data.entries.length === 0) return null;
  const top = data.entries[0];
  const max = Math.max(1, ...data.entries.map((e) => e.grossValue || 0));

  const titleNode = (e: (typeof data.entries)[number], className: string) =>
    e.movie ? (
      <Link href={`/movie/${e.movie.slug}`} className={`${className} hover:text-accent transition-colors`}>
        {e.title}
      </Link>
    ) : (
      <span className={className}>{e.title}</span>
    );

  return (
    <section className="mt-6 border border-line rounded-xl bg-card p-4 sm:p-5 min-w-0">
      {/* Hlavička */}
      <div className="flex items-end justify-between gap-3 mb-4">
        <div className="min-w-0">
          <h2 className="font-display font-extrabold text-lg text-ink flex items-center gap-2">
            <span className="w-1 h-5 rounded-full bg-amber-400 inline-block" />
            {t('boxoffice_vikend.nadpis')}
          </h2>
          <p className="text-xs text-muted mt-0.5 ml-3">
            {t('boxoffice_vikend.vikend')} {weekendLabel(data.weekendStart, data.weekendEnd)}
          </p>
        </div>
        <Link href="/box-office" className="text-[11px] font-semibold text-white bg-accent px-2.5 py-1 rounded-full hover:bg-accent-dark flex-none">
          {t('boxoffice_vikend.viac')}
        </Link>
      </div>

      <div className="grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] gap-5">
        {/* Zvýraznený film č. 1 (len na väčšej obrazovke) */}
        <div className="hidden lg:block border border-line rounded-xl p-3 bg-surface/40">
          <div className="flex gap-3">
            {top.movie?.poster ? (
              <Link href={`/movie/${top.movie.slug}`} className="flex-none">
                <img src={top.movie.poster} alt={top.title} className="w-24 h-36 rounded-lg object-cover bg-surface" />
              </Link>
            ) : (
              <div className="w-24 h-36 rounded-lg bg-surface flex-none" />
            )}
            <div className="min-w-0">
              {titleNode(top, 'font-display font-bold text-base text-ink leading-snug')}
              <div className="text-xs text-muted mt-1 flex flex-wrap gap-x-1.5">
                {top.movie?.percent !== null && top.movie?.percent !== undefined && <span className="font-bold text-ink">{top.movie.percent} %</span>}
                {top.movie?.year && <span>· {top.movie.year}</span>}
                {formatRuntime(top.movie?.runtimeMinutes ?? null) && <span>· {formatRuntime(top.movie?.runtimeMinutes ?? null)}</span>}
              </div>
              <div className="text-sm text-ink mt-2">
                <span className="font-bold">{top.grossLabel}</span>
                {top.totalLabel && (
                  <span className="text-muted">
                    {' '}
                    · {t('boxoffice_vikend.celkom')} {top.totalLabel}
                  </span>
                )}
              </div>
            </div>
          </div>
          {top.movie?.synopsis && <p className="text-xs text-ink/80 mt-3 line-clamp-4 leading-relaxed">{top.movie.synopsis}</p>}
          {top.movie && top.movie.directors.length > 0 && (
            <div className="text-xs mt-2">
              <div className="font-semibold text-ink">{t('boxoffice_vikend.rezia')}</div>
              <PeopleLinks people={top.movie.directors} />
            </div>
          )}
          {top.movie && top.movie.stars.length > 0 && (
            <div className="text-xs mt-2">
              <div className="font-semibold text-ink">{t('boxoffice_vikend.hraju')}</div>
              <PeopleLinks people={top.movie.stars} />
            </div>
          )}
        </div>

        {/* Rebríček s pruhmi (počítač) */}
        <ol className="hidden lg:flex flex-col gap-2.5 min-w-0">
          {data.entries.map((e, i) => (
            <li key={`${e.rank}-${e.title}`} className="min-w-0">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="truncate">
                  {i === 0 && <span className="text-[10px] mr-1 text-ink">▸</span>}
                  {titleNode(e, `${i === 0 ? 'font-bold text-ink' : 'text-ink/80'}`)}
                </span>
                <span className={`flex-none tabular-nums ${i === 0 ? 'font-bold text-ink' : 'text-muted'}`}>{e.grossLabel}</span>
              </div>
              <div className="h-1.5 rounded-full bg-line mt-1 overflow-hidden">
                <div className={`h-full rounded-full ${i === 0 ? 'bg-ink' : 'bg-muted/60'}`} style={{ width: `${Math.max(2, ((e.grossValue || 0) / max) * 100)}%` }} />
              </div>
            </li>
          ))}
        </ol>

        {/* Číslovaný zoznam (mobil a tablet) */}
        <ol className="lg:hidden divide-y divide-line -mx-1">
          {data.entries.map((e) => (
            <li key={`m-${e.rank}-${e.title}`} className="flex items-center gap-3 py-2.5 px-1">
              <span className="w-5 text-center font-display font-bold text-ink flex-none">{e.rank}</span>
              {e.movie?.poster ? (
                <Link href={`/movie/${e.movie.slug}`} className="flex-none">
                  <img src={e.movie.poster} alt="" className="w-10 h-14 rounded-md object-cover bg-surface" />
                </Link>
              ) : (
                <div className="w-10 h-14 rounded-md bg-surface flex-none" />
              )}
              <div className="min-w-0 flex-1">
                <div className="truncate">{titleNode(e, 'font-semibold text-sm text-ink')}</div>
                <div className="text-xs text-muted tabular-nums">{e.grossLabel}</div>
              </div>
              {e.movie?.percent !== null && e.movie?.percent !== undefined && (
                <span className="text-[11px] font-bold text-ink border border-line rounded-full px-2 py-0.5 flex-none">{e.movie.percent} %</span>
              )}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
