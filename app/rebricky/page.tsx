import Link from 'next/link';
import { unstable_cache } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { computePercent } from '@/lib/rating';
import ScoreBadge from '@/components/ScoreBadge';
import StarRating from '@/components/StarRating';
import PersonNameList from '@/components/PersonNameList';
import { getDictionary, getUserLanguage } from '@/lib/i18n';

export const dynamic = 'force-dynamic';

const RANKING_LIMIT = 100;

// Rebríček (spoločný pre všetkých návštevníkov) — počíta sa z agregovaných
// súčtov hodnotení, nie zo všetkých riadkov hodnotení, a ukladá sa do
// zdieľanej cache na 10 minút. Zobrazuje sa prvých 100 titulov.
const getRanking = unstable_cache(
  async (contentType: string) => {
    const agg = await prisma.rating.groupBy({
      by: ['movieId'],
      where: { seasonId: null, episodeId: null, movie: { approved: true, contentType } },
      _avg: { value: true },
      _count: { _all: true }
    });
    const stats = new Map(agg.map((a) => [a.movieId, { avg: a._avg.value || 0, count: a._count._all }]));
    const movies = stats.size
      ? await prisma.movie.findMany({
          where: { id: { in: Array.from(stats.keys()) } },
          select: { id: true, slug: true, title: true, year: true, poster: true, countries: true, genres: true, director: true, cast: true }
        })
      : [];

    const ranked = movies
      .map((m) => {
        const st = stats.get(m.id) || { avg: 0, count: 0 };
        // computePercent pracuje s jednotlivými hodnoteniami — priemer zopakovaný
        // „počet“-krát dá rovnaký výsledok (rovnaký postup ako katalóg filtra).
        const values = Array.from({ length: st.count }, () => ({ value: st.avg }));
        return { ...m, ratingCount: st.count, percent: computePercent(values as any) as number | null };
      })
      .filter((m) => m.percent !== null)
      .sort((a, b) => (b.percent as number) - (a.percent as number) || b.ratingCount - a.ratingCount)
      .slice(0, RANKING_LIMIT);

    const allNames = Array.from(
      new Set(
        ranked.flatMap((m) => [
          ...(m.director ? m.director.split(',').map((x) => x.trim()) : []),
          ...(m.cast ? m.cast.split(',').map((x) => x.trim()).slice(0, 2) : [])
        ])
      )
    );
    const people = allNames.length
      ? await prisma.person.findMany({ where: { name: { in: allNames } }, select: { name: true, slug: true } })
      : [];
    return { ranked, people };
  },
  ['rebricky-v1'],
  { revalidate: 600, tags: ['rebricky'] }
);

export default async function RebrickyPage(props: { searchParams: Promise<{ typ?: string }> }) {
  const { searchParams } = { ...props, searchParams: await props.searchParams };
  const session = await getServerSession(authOptions);
  const viewerId = (session?.user as any)?.id;
  const dict = await getDictionary(await getUserLanguage());
  const t = (key: string) => dict[key] || key;

  const activeType = searchParams?.typ === 'serialy' ? 'Seriál' : 'Film';

  const { ranked, people } = await getRanking(activeType);
  const slugByName = new Map(people.map((p) => [p.name, p.slug]));

  // Vlastné hodnotenia prihláseného — jeden malý dopyt len pre zobrazené tituly.
  const myRatings = viewerId && ranked.length
    ? await prisma.rating.findMany({
        where: { userId: viewerId, seasonId: null, episodeId: null, movieId: { in: ranked.map((m) => m.id) } },
        select: { movieId: true, value: true }
      })
    : [];
  const myByMovie = new Map(myRatings.map((r) => [r.movieId, r.value]));

  return (
    <div className="pt-8">
      <h1 className="font-display font-extrabold text-3xl text-ink mb-2">{t('rebricky.nadpis')}</h1>
      <p className="text-muted mb-6">{t('rebricky.popis')}</p>

      <div className="flex gap-2 mb-8">
        <Link
          href="/rebricky"
          className={`text-sm font-semibold px-4 py-2 rounded-full border transition-colors ${
            activeType === 'Film' ? 'bg-night text-white border-night' : 'text-muted border-line hover:border-night hover:text-ink'
          }`}
        >
          {t('rebricky.top_filmy')}
        </Link>
        <Link
          href="/rebricky?typ=serialy"
          className={`text-sm font-semibold px-4 py-2 rounded-full border transition-colors ${
            activeType === 'Seriál' ? 'bg-night text-white border-night' : 'text-muted border-line hover:border-night hover:text-ink'
          }`}
        >
          {t('rebricky.top_serialy')}
        </Link>
      </div>

      {ranked.length === 0 ? (
        <div className="border border-line rounded-xl p-8 text-center text-muted bg-surface">
          {t('rebricky.prazdny')}
        </div>
      ) : (
        <div className="border border-line rounded-xl divide-y divide-line overflow-hidden">
          {ranked.map((m, i) => {
            const director = m.director ? m.director.split(',').map((x) => x.trim()) : [];
            const actors = m.cast ? m.cast.split(',').map((x) => x.trim()).slice(0, 2) : [];
            const myRating = myByMovie.get(m.id) || 0;

            return (
              <div key={m.id} className="flex items-start gap-4 p-4 bg-card hover:bg-surface transition-colors">
                <span className="w-6 text-center font-display font-extrabold text-lg text-accent flex-none pt-2">{i + 1}</span>

                <Link href={`/movie/${m.slug}`} className="w-14 h-20 rounded-md bg-surface bg-cover bg-center flex-none" style={m.poster ? { backgroundImage: `url('${m.poster}')` } : undefined} />

                <div className="flex-1 min-w-0 pt-0.5">
                  <Link href={`/movie/${m.slug}`} className="font-display font-bold text-ink hover:text-accent transition-colors">
                    {m.title} <span className="text-muted font-normal">({m.year})</span>
                  </Link>
                  <div className="text-xs text-muted mt-1">
                    {[m.countries, m.genres].filter(Boolean).join(' · ')}
                  </div>
                  {director.length > 0 && (
                    <div className="text-xs text-muted mt-1">
                      <span className="text-ink font-semibold">{t('rebricky.rezia')} </span>
                      <PersonNameList names={director} slugByName={slugByName} />
                    </div>
                  )}
                  {actors.length > 0 && (
                    <div className="text-xs text-muted mt-0.5">
                      <span className="text-ink font-semibold">{t('rebricky.hraju')} </span>
                      <PersonNameList names={actors} slugByName={slugByName} />
                    </div>
                  )}
                </div>

                <div className="flex-none flex flex-col items-end gap-1.5 pt-0.5">
                  <ScoreBadge percent={m.percent} count={m.ratingCount} size="sm" />
                  <StarRating rating={myRating} size="w-3.5 h-3.5" />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
