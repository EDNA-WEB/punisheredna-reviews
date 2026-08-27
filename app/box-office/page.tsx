import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import BoxOfficeStatus from '@/components/BoxOfficeStatus';
import { formatMoney, computeBoxOffice } from '@/lib/boxOffice';
import { getDictionary, getUserLanguage } from '@/lib/i18n';

export const dynamic = 'force-dynamic';

export default async function BoxOfficePage() {
  const dict = await getDictionary(await getUserLanguage());
  const t = (key: string) => dict[key] || key;

  const movies = await prisma.movie.findMany({
    where: { approved: true, budget: { not: null } },
    orderBy: { boxOffice: 'desc' },
    select: { id: true, title: true, slug: true, poster: true, year: true, budget: true, marketingBudget: true, boxOffice: true, domesticBoxOffice: true, internationalBoxOffice: true }
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
      <h1 className="font-display font-extrabold text-3xl text-ink mb-2">{t('boxoffice.nadpis')}</h1>
      <p className="text-muted mb-8">{t('boxoffice.popis')}</p>

      {movies.length === 0 ? (
        <div className="border border-line rounded-xl p-12 text-center text-muted bg-surface">
          {t('boxoffice.prazdny_zoznam')}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {movies.map((m) => {
            const stats = computeBoxOffice(m.budget, m.marketingBudget, m.boxOffice);
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
                    {t('boxoffice.rozpocet')} {formatMoney(m.budget!)}
                    {m.marketingBudget ? ` · ${t('boxoffice.marketing')} ${formatMoney(m.marketingBudget)}` : ''}
                  </div>
                  {stats && (
                    <BoxOfficeStatus
                      budget={m.budget}
                      marketingBudget={m.marketingBudget}
                      boxOffice={m.boxOffice}
                      domesticBoxOffice={m.domesticBoxOffice}
                      internationalBoxOffice={m.internationalBoxOffice}
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
