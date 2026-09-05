import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import BoxOfficeStatus from '@/components/BoxOfficeStatus';
import BoxOfficeSortSelect from '@/components/BoxOfficeSortSelect';
import { formatMoney, computeBoxOffice } from '@/lib/boxOffice';
import { adjustForInflation } from '@/lib/inflation';
import { getDictionary, getUserLanguage } from '@/lib/i18n';

export const dynamic = 'force-dynamic';

export default async function BoxOfficePage({ searchParams }: { searchParams: { sort?: string } }) {
  const dict = await getDictionary(await getUserLanguage());
  const t = (key: string) => dict[key] || key;
  const sort = searchParams.sort || 'trzby';

  const allMovies = await prisma.movie.findMany({
    where: { approved: true, budget: { not: null } },
    select: {
      id: true, title: true, slug: true, poster: true, year: true, budget: true, marketingBudget: true, boxOffice: true,
      domesticBoxOffice: true, internationalBoxOffice: true, chinaBoxOffice: true, ancillaryRevenue: true,
      premiereDates: { select: { type: true } }
    }
  });

  // Filmy, čo vyšli LEN na VOD (žiadna kinová premiéra), do box office nepatria —
  // nemajú žiadne tržby z kín, box office model na ne jednoducho nesedí.
  const withoutVod = allMovies.filter((m) => {
    if (m.premiereDates.length === 0) return true; // premiéry ešte nevyplnené — nechávame tak, ako doteraz
    return m.premiereDates.some((p) => p.type !== 'VOD');
  });

  const withStats = withoutVod.map((m) => {
    const stats = computeBoxOffice(
      m.budget !== null ? Number(m.budget) : null,
      m.marketingBudget !== null ? Number(m.marketingBudget) : null,
      m.boxOffice !== null ? Number(m.boxOffice) : null,
      m.domesticBoxOffice !== null ? Number(m.domesticBoxOffice) : null,
      m.internationalBoxOffice !== null ? Number(m.internationalBoxOffice) : null,
      m.chinaBoxOffice !== null ? Number(m.chinaBoxOffice) : null,
      m.ancillaryRevenue !== null ? Number(m.ancillaryRevenue) : null
    );
    const releaseYear = Number(m.year) || new Date().getFullYear();
    const adjustedEarned = stats ? adjustForInflation(stats.earned, releaseYear) : 0;
    return { movie: m, stats, adjustedEarned };
  });

  const sorted = [...withStats].sort((a, b) => {
    if (sort === 'inflacia') return b.adjustedEarned - a.adjustedEarned;
    if (sort === 'zisk') return (b.stats?.profit ?? -Infinity) - (a.stats?.profit ?? -Infinity);
    return (b.stats?.earned ?? 0) - (a.stats?.earned ?? 0);
  });

  const labels = {
    ciel: t('boxoffice.ciel'),
    ziskovy: t('boxoffice.ziskovy'),
    nedosiahnute: t('boxoffice.nedosiahnute'),
    nad_cielom: t('boxoffice.nad_cielom'),
    do_ciela: t('boxoffice.do_ciela'),
    domace: t('boxoffice.domace'),
    medzinarodne: t('boxoffice.medzinarodne'),
    celosvetovo: t('boxoffice.celosvetovo'),
    vsetky_uvedenia: t('boxoffice.vsetky_uvedenia')
  };

  return (
    <div className="pt-8">
      <div className="flex items-start justify-between gap-4 flex-wrap mb-2">
        <h1 className="font-display font-extrabold text-3xl text-ink">{t('boxoffice.nadpis')}</h1>
        <div className="flex items-center gap-3">
          <Link href="/box-office/porovnanie" className="text-xs font-semibold text-accent hover:underline whitespace-nowrap">
            Porovnať 2 filmy →
          </Link>
          <BoxOfficeSortSelect currentSort={sort} />
        </div>
      </div>
      <p className="text-muted mb-8">{t('boxoffice.popis')}</p>

      {sorted.length === 0 ? (
        <div className="border border-line rounded-xl p-12 text-center text-muted bg-surface">
          {t('boxoffice.prazdny_zoznam')}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {sorted.map(({ movie: m, stats, adjustedEarned }) => {
            return (
              <Link
                key={m.id}
                href={`/movie/${m.slug}`}
                className="flex gap-3 border border-line rounded-xl p-3 bg-card hover:border-accent transition-colors"
              >
                <div
                  className="w-11 h-16 rounded bg-surface bg-cover bg-center flex-none"
                  style={m.poster ? { backgroundImage: `url('${m.poster}')` } : undefined}
                />
                <div className="min-w-0 flex-1">
                  <div className="font-display font-bold text-sm text-ink truncate">
                    {m.title} {m.year && <span className="text-muted font-normal">· {m.year}</span>}
                  </div>
                  <div className="text-[11px] text-muted mt-0.5 mb-1.5 truncate">
                    {t('boxoffice.rozpocet')} {formatMoney(Number(m.budget!))}
                    {m.marketingBudget ? ` · ${t('boxoffice.marketing')} ${formatMoney(Number(m.marketingBudget))}` : ''}
                  </div>
                  {sort === 'inflacia' && stats && (
                    <div className="text-[11px] font-semibold text-accent mb-1">
                      V dnešnej hodnote: {formatMoney(adjustedEarned)}
                    </div>
                  )}
                  {stats && (
                    <BoxOfficeStatus
                      budget={m.budget}
                      marketingBudget={m.marketingBudget}
                      boxOffice={m.boxOffice}
                      domesticBoxOffice={m.domesticBoxOffice}
                      internationalBoxOffice={m.internationalBoxOffice}
                      chinaBoxOffice={m.chinaBoxOffice}
                      ancillaryRevenue={m.ancillaryRevenue}
                      labels={labels}
                      compact
                    />
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
