import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import VodTabs from '@/components/VodTabs';
import KinoYearFilter from '@/components/KinoYearFilter';
import { computePercent, scoreColorStyle } from '@/lib/rating';

export const dynamic = 'force-dynamic';

export default async function VodRocnyPrehladPage({ searchParams }: { searchParams: { year?: string } }) {
  const year = Number(searchParams.year) || new Date().getFullYear();

  const rangeStart = new Date(year, 0, 1);
  const rangeEnd = new Date(year + 1, 0, 1);

  const movieRows = await prisma.moviePremiereDate.findMany({
    where: {
      type: 'VOD',
      releaseDate: { gte: rangeStart, lt: rangeEnd },
      movie: { approved: true }
    },
    orderBy: { releaseDate: 'asc' },
    include: {
      movie: {
        select: { id: true, title: true, slug: true, year: true, ratings: { select: { value: true } } }
      }
    }
  });

  // Jeden film/seriál môže mať viac VOD premiér (rôzne krajiny) — v tomto prehľade
  // ho zobrazíme len raz, pri jeho najskoršej VOD premiére v danom roku.
  const seenMovieIds = new Set<string>();
  const movies: (typeof movieRows[number]['movie'] & { releaseDate: Date })[] = [];
  for (const row of movieRows) {
    if (seenMovieIds.has(row.movieId)) continue;
    seenMovieIds.add(row.movieId);
    movies.push({ ...row.movie, releaseDate: row.releaseDate });
  }

  // Zoskupenie podľa mesiaca, a v rámci mesiaca podľa presného dňa
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

  const MONTH_NAMES = ['Január', 'Február', 'Marec', 'Apríl', 'Máj', 'Jún', 'Júl', 'August', 'September', 'Október', 'November', 'December'];

  return (
    <div className="pt-8 grid lg:grid-cols-[1fr_280px] gap-8 items-start">
      <div className="min-w-0">
      <h1 className="font-display font-extrabold text-xl sm:text-3xl text-ink mb-6 text-center">Ročný prehľad VOD premiér</h1>

      <VodTabs />

      <div className="border border-line rounded-xl bg-card p-4 mb-6">
        <KinoYearFilter year={year} basePath="/vod/rocny-prehlad" />
      </div>

      {sortedMonths.length === 0 ? (
        <div className="border border-line rounded-xl p-8 text-center text-muted bg-surface">V tomto roku zatiaľ nie sú žiadne VOD premiéry.</div>
      ) : (
        <div className="space-y-6">
          {sortedMonths.map((monthIdx) => {
            const dayMap = monthGroups.get(monthIdx)!;
            const sortedDays = Array.from(dayMap.keys()).sort();

            return (
              <div key={monthIdx}>
                <div className="bg-surface border border-line rounded-t-xl px-4 py-2.5">
                  <span className="text-sm font-bold text-ink">
                    {MONTH_NAMES[monthIdx - 1]} {year}
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
