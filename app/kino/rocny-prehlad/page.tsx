import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { getDictionary, getUserLanguage } from '@/lib/i18n';
import KinoTabs from '@/components/KinoTabs';
import KinoYearFilter from '@/components/KinoYearFilter';
import Badge from '@/components/Badge';
import { computePercent, scoreColorStyle } from '@/lib/rating';

export const dynamic = 'force-dynamic';

export default async function KinoRocnyPrehladPage({ searchParams }: { searchParams: { year?: string } }) {
  const year = Number(searchParams.year) || new Date().getFullYear();
  const dict = await getDictionary(await getUserLanguage());
  const t = (key: string) => dict[key] || key;

  const rangeStart = new Date(year, 0, 1);
  const rangeEnd = new Date(year + 1, 0, 1);

  const movies = await prisma.movie.findMany({
    where: { approved: true, contentType: 'Film', releaseDate: { gte: rangeStart, lt: rangeEnd } },
    orderBy: { releaseDate: 'asc' },
    select: { id: true, title: true, slug: true, year: true, nowShowing: true, releaseDate: true, ratings: { select: { value: true } }, premiereDates: { select: { country: true, type: true, distributor: true } } }
  });

  // Zoskupenie podľa mesiaca, a v rámci mesiaca podľa presného dňa (kvôli zlúčeným riadkom dátumu)
  const monthGroups = new Map<number, Map<string, typeof movies>>();
  for (const m of movies) {
    if (!m.releaseDate) continue;
    const monthIdx = m.releaseDate.getMonth() + 1;
    const dayKey = m.releaseDate.toISOString().slice(0, 10);
    if (!monthGroups.has(monthIdx)) monthGroups.set(monthIdx, new Map());
    const dayMap = monthGroups.get(monthIdx)!;
    if (!dayMap.has(dayKey)) dayMap.set(dayKey, []);
    dayMap.get(dayKey)!.push(m);
  }
  const sortedMonths = Array.from(monthGroups.keys()).sort((a, b) => a - b);

  return (
    <div className="pt-8 grid lg:grid-cols-[1fr_280px] gap-8 items-start">
      <div className="min-w-0">
      <h1 className="font-display font-extrabold text-xl sm:text-3xl text-ink mb-6 text-center">{t('kino.rocny_nadpis')}</h1>

      <KinoTabs />

      <div className="border border-line rounded-xl bg-card p-4 mb-6">
        <KinoYearFilter year={year} />
      </div>

      {sortedMonths.length === 0 ? (
        <div className="border border-line rounded-xl p-8 text-center text-muted bg-surface">{t('kino.rocny_prazdny')}</div>
      ) : (
        <div className="space-y-6">
          {sortedMonths.map((monthIdx) => {
            const dayMap = monthGroups.get(monthIdx)!;
            const sortedDays = Array.from(dayMap.keys()).sort();

            return (
              <div key={monthIdx}>
                <div className="bg-surface border border-line rounded-t-xl px-4 py-2.5">
                  <span className="text-sm font-bold text-ink">
                    {t(`month.${monthIdx}`)} {year}
                  </span>
                </div>
                <div className="border border-t-0 border-line rounded-b-xl divide-y divide-line overflow-hidden">
                  {sortedDays.map((dayKey) => {
                    const dayMovies = dayMap.get(dayKey)!;
                    const dayLabel = new Date(dayKey).toLocaleDateString('sk-SK', { day: '2-digit', month: '2-digit' });

                    return dayMovies.map((m, i) => {
                      const percent = computePercent(m.ratings);
                      return (
                      <div key={m.id} className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 bg-card hover:bg-surface transition-colors min-w-0">
                        <span className="w-8 sm:w-12 flex-none text-xs font-semibold text-muted">{i === 0 ? dayLabel : ''}</span>
                        <span
                          className="w-2 h-2 rounded-[2px] flex-none"
                          style={{ backgroundColor: scoreColorStyle(percent).backgroundColor }}
                          title={percent === null ? undefined : `${percent} %`}
                        />
                        <Link href={`/movie/${m.slug}`} className="flex-1 min-w-0 text-sm font-semibold text-ink hover:text-accent transition-colors truncate">
                          {m.title} <span className="text-muted font-normal">{m.year}</span>
                        </Link>
                        <span className="w-32 flex-none text-xs text-muted truncate hidden sm:block">
                          {(m.premiereDates.find((p) => p.country === 'CZ' && p.type !== 'VOD') || m.premiereDates.find((p) => p.country === 'CZ') || m.premiereDates[0])?.distributor || '—'}
                        </span>
                        {m.nowShowing && (
                          <Badge tone="success" size="sm" className="flex-none whitespace-nowrap text-[10px] sm:text-xs px-1.5 sm:px-2">
                            {t('kino.hraju_v_kinach')}
                          </Badge>
                        )}
                      </div>
                      );
                    });
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
      </div>

      <div />
    </div>
  );
}
