import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { getDictionary, getUserLanguage } from '@/lib/i18n';
import KinoFilter from '@/components/KinoFilter';
import PersonNameList from '@/components/PersonNameList';

export const dynamic = 'force-dynamic';

export default async function VodPage({ searchParams }: { searchParams: { month?: string; year?: string } }) {
  const now = new Date();
  const month = Math.min(12, Math.max(1, Number(searchParams.month) || now.getMonth() + 1));
  const year = Number(searchParams.year) || now.getFullYear();

  const dict = await getDictionary(await getUserLanguage());
  const t = (key: string) => dict[key] || key;

  const rangeStart = new Date(year, month - 1, 1);
  const rangeEnd = new Date(year, month, 1);

  const movieRows = await prisma.moviePremiereDate.findMany({
    where: {
      type: 'VOD',
      releaseDate: { gte: rangeStart, lt: rangeEnd },
      movie: { approved: true }
    },
    orderBy: { releaseDate: 'asc' },
    include: { movie: true }
  });

  // Jeden film/seriál môže mať viac VOD premiér (rôzne krajiny) — v tomto prehľade
  // ho zobrazíme len raz, pri jeho najskoršej VOD premiére v danom mesiaci.
  const seenMovieIds = new Set<string>();
  const movies: (typeof movieRows[number]['movie'] & { releaseDate: Date })[] = [];
  for (const row of movieRows) {
    if (seenMovieIds.has(row.movieId)) continue;
    seenMovieIds.add(row.movieId);
    movies.push({ ...row.movie, releaseDate: row.releaseDate });
  }

  const allNames = Array.from(
    new Set(
      movies.flatMap((m) => [
        ...(m.director ? m.director.split(',').map((x) => x.trim()) : []),
        ...(m.cast ? m.cast.split(',').map((x) => x.trim()).slice(0, 3) : [])
      ])
    )
  );
  const people = allNames.length ? await prisma.person.findMany({ where: { name: { in: allNames } }, select: { name: true, slug: true } }) : [];
  const slugByName = new Map(people.map((p) => [p.name, p.slug]));

  // Zoskupenie podľa presného dátumu premiéry
  const groups = new Map<string, typeof movies>();
  for (const m of movies) {
    if (!m.releaseDate) continue;
    const key = m.releaseDate.toISOString().slice(0, 10);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(m);
  }
  const sortedGroupKeys = Array.from(groups.keys()).sort();

  return (
    <div className="pt-8 grid lg:grid-cols-[1fr_280px] gap-8 items-start">
      <div>
      <h1 className="font-display font-extrabold text-3xl text-ink mb-6 text-center">
        VOD premiéry {t(`month.${month}`)}/{year}
      </h1>

      <div className="border border-line rounded-xl bg-card p-4 mb-6">
        <KinoFilter month={month} year={year} basePath="/vod" />
      </div>

      {sortedGroupKeys.length === 0 ? (
        <div className="border border-line rounded-xl p-8 text-center text-muted bg-surface">V tomto mesiaci zatiaľ nie sú žiadne VOD premiéry.</div>
      ) : (
        <div className="space-y-6">
          {sortedGroupKeys.map((dateKey) => {
            const dateObj = new Date(dateKey);
            const dateLabel = dateObj.toLocaleDateString('sk-SK', { day: '2-digit', month: '2-digit', year: 'numeric' });
            const dayMovies = groups.get(dateKey)!;

            return (
              <div key={dateKey}>
                <div className="bg-surface border border-line rounded-t-xl px-4 py-2.5">
                  <span className="text-sm font-bold text-ink">Na VOD od {dateLabel}</span>
                </div>
                <div className="border border-t-0 border-line rounded-b-xl divide-y divide-line overflow-hidden">
                  {dayMovies.map((m) => {
                    const director = m.director ? m.director.split(',').map((x) => x.trim()) : [];
                    const actors = m.cast ? m.cast.split(',').map((x) => x.trim()).slice(0, 3) : [];
                    const genresList = m.genres ? m.genres.split(',').map((g) => g.trim()) : [];

                    return (
                      <div key={m.id} className="flex gap-4 p-4 bg-card hover:bg-surface transition-colors">
                        <Link
                          href={`/movie/${m.slug}`}
                          className="w-14 h-20 rounded-md bg-surface bg-cover bg-center flex-none"
                          style={m.poster ? { backgroundImage: `url('${m.poster}')` } : undefined}
                        />

                        <div className="flex-1 min-w-0">
                          <Link href={`/movie/${m.slug}`} className="font-display font-bold text-ink hover:text-accent transition-colors">
                            {m.title} <span className="text-muted font-normal">{m.year}</span>
                          </Link>
                          <div className="text-xs text-muted mt-1">
                            {[m.countries, genresList.join(', ')].filter(Boolean).join(' · ')}
                          </div>
                          {director.length > 0 && (
                            <div className="text-xs text-muted mt-1">
                              <span className="text-ink font-semibold">Réžia: </span>
                              <PersonNameList names={director} slugByName={slugByName} />
                            </div>
                          )}
                          {actors.length > 0 && (
                            <div className="text-xs text-muted mt-0.5">
                              <span className="text-ink font-semibold">Hrajú: </span>
                              <PersonNameList names={actors} slugByName={slugByName} />
                            </div>
                          )}
                        </div>
                      </div>
                    );
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
