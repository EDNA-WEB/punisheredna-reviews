import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import MovieCard from '@/components/MovieCard';
import SortDropdown from '@/components/SortDropdown';
import { computePercent } from '@/lib/rating';
import { getDictionary, getUserLanguage } from '@/lib/i18n';
import Pagination from '@/components/Pagination';
import { IconChevronRight } from '@/components/Icons';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 24;

type SearchParams = {
  genre?: string;
  genres?: string;
  country?: string;
  countries?: string;
  types?: string;
  yearFrom?: string;
  yearTo?: string;
  ratingFrom?: string;
  ratingTo?: string;
  actor?: string;
  director?: string;
  screenplay?: string;
  cinematography?: string;
  music?: string;
  tag?: string;
  minLength?: string;
  maxLength?: string;
  nowShowing?: string;
  hasReviews?: string;
  hasGallery?: string;
  hasVideos?: string;
  hasTrivia?: string;
  page?: string;
  sort?: string;
};

export default async function MoviesPage({ searchParams }: { searchParams: SearchParams }) {
  const dict = await getDictionary(await getUserLanguage());
  const t = (key: string) => dict[key] || key;

  const page = Math.max(1, Number(searchParams?.page) || 1);
  const genreFilter = searchParams?.genre || null;
  const genresFilter = searchParams?.genres ? searchParams.genres.split(',').filter(Boolean) : [];
  const countryFilter = searchParams?.country || null;
  const countriesFilter = searchParams?.countries ? searchParams.countries.split(',').filter(Boolean) : [];
  const typesFilter = searchParams?.types ? searchParams.types.split(',').filter(Boolean) : [];
  const nowShowingFilter = searchParams?.nowShowing === '1';
  const hasReviewsFilter = searchParams?.hasReviews === '1';
  const hasGalleryFilter = searchParams?.hasGallery === '1';
  const hasVideosFilter = searchParams?.hasVideos === '1';
  const hasTriviaFilter = searchParams?.hasTrivia === '1';
  const yearFrom = searchParams?.yearFrom ? Number(searchParams.yearFrom) : null;
  const yearTo = searchParams?.yearTo ? Number(searchParams.yearTo) : null;
  const ratingFrom = searchParams?.ratingFrom ? Number(searchParams.ratingFrom) : null;
  const ratingTo = searchParams?.ratingTo ? Number(searchParams.ratingTo) : null;
  const actorFilter = searchParams?.actor || null;
  const directorFilter = searchParams?.director || null;
  const screenplayFilter = searchParams?.screenplay || null;
  const cinematographyFilter = searchParams?.cinematography || null;
  const musicFilter = searchParams?.music || null;
  const tagFilter = searchParams?.tag || null;
  const minLength = searchParams?.minLength ? Number(searchParams.minLength) : null;
  const maxLength = searchParams?.maxLength ? Number(searchParams.maxLength) : null;

  const hasAdvancedFilter =
    genresFilter.length > 0 || countryFilter || countriesFilter.length > 0 || typesFilter.length > 0 || yearFrom || yearTo || ratingFrom || ratingTo ||
    actorFilter || directorFilter || screenplayFilter || cinematographyFilter || musicFilter || tagFilter || minLength || maxLength || nowShowingFilter || hasReviewsFilter ||
    hasGalleryFilter || hasVideosFilter || hasTriviaFilter;

  const movies = await prisma.movie.findMany({
    orderBy: { createdAt: 'desc' },
    where: {
      approved: true,
      ...(actorFilter ? { cast: { contains: actorFilter, mode: 'insensitive' } } : {}),
      ...(directorFilter ? { director: { contains: directorFilter, mode: 'insensitive' } } : {}),
      ...(screenplayFilter ? { screenplay: { contains: screenplayFilter, mode: 'insensitive' } } : {}),
      ...(cinematographyFilter ? { cinematography: { contains: cinematographyFilter, mode: 'insensitive' } } : {}),
      ...(musicFilter ? { music: { contains: musicFilter, mode: 'insensitive' } } : {}),
      ...(tagFilter ? { tags: { contains: tagFilter, mode: 'insensitive' } } : {}),
      ...(countryFilter ? { countries: { contains: countryFilter, mode: 'insensitive' } } : {}),
      ...(typesFilter.length > 0 ? { contentType: { in: typesFilter } } : {}),
      ...(nowShowingFilter ? { nowShowing: true } : {}),
      ...(minLength ? { runtimeMinutes: { gte: minLength } } : {}),
      ...(maxLength ? { runtimeMinutes: { lte: maxLength } } : {})
    },
    include: {
      ratings: { where: { seasonId: null, episodeId: null } },
      _count: {
        select: {
          reviews: { where: { seasonId: null, episodeId: null } },
          photos: { where: { episodeId: null } },
          videos: { where: { episodeId: null } },
          trivia: true
        }
      }
    }
  });

  const withScore = movies.map((m) => ({
    ...m,
    percent: computePercent(m.ratings),
    genreList: (m.genres || '').split(',').map((g) => g.trim()).filter(Boolean),
    yearNum: m.year ? parseInt(m.year, 10) : null
  }));

  const allGenres = Array.from(new Set(withScore.flatMap((m) => m.genreList))).sort();

  let filtered = withScore;
  if (genreFilter) filtered = filtered.filter((m) => m.genreList.includes(genreFilter));
  if (genresFilter.length > 0) filtered = filtered.filter((m) => genresFilter.some((g) => m.genreList.includes(g)));
  if (yearFrom !== null) filtered = filtered.filter((m) => m.yearNum !== null && m.yearNum >= yearFrom);
  if (yearTo !== null) filtered = filtered.filter((m) => m.yearNum !== null && m.yearNum <= yearTo);
  if (ratingFrom !== null) filtered = filtered.filter((m) => m.percent !== null && m.percent >= ratingFrom);
  if (ratingTo !== null) filtered = filtered.filter((m) => m.percent !== null && m.percent <= ratingTo);
  if (countriesFilter.length > 0) filtered = filtered.filter((m) => countriesFilter.some((c) => (m.countries || '').includes(c)));
  if (hasReviewsFilter) filtered = filtered.filter((m) => m._count.reviews > 0);
  if (hasGalleryFilter) filtered = filtered.filter((m) => m._count.photos > 0);
  if (hasVideosFilter) filtered = filtered.filter((m) => m._count.videos > 0);
  if (hasTriviaFilter) filtered = filtered.filter((m) => m._count.trivia > 0);

  const sort = searchParams?.sort || 'najnovsie';
  filtered = [...filtered].sort((a, b) => {
    if (sort === 'najstarsie') return (a.yearNum ?? 0) - (b.yearNum ?? 0);
    if (sort === 'najlepsie') return (b.percent ?? -1) - (a.percent ?? -1);
    if (sort === 'najhorsie') return (a.percent ?? 101) - (b.percent ?? 101);
    // predvolené: najnovšie (podľa roku, nie podľa dátumu pridania na web)
    return (b.yearNum ?? 0) - (a.yearNum ?? 0);
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const qs = new URLSearchParams();
  Object.entries(searchParams || {}).forEach(([k, v]) => {
    if (k !== 'page' && v) qs.set(k, String(v));
  });
  const basePath = qs.toString() ? `/recenzie?${qs.toString()}` : '/recenzie';

  return (
    <div>
      <div className="pt-8 pb-6">
        <h1 className="font-display font-extrabold text-3xl sm:text-4xl text-ink leading-tight mb-2">{t('recenzie.nadpis')}</h1>
        <p className="text-muted max-w-xl">{t('recenzie.popis')}</p>
        {hasAdvancedFilter && (
          <div className="mt-3 flex items-center gap-2 flex-wrap text-sm">
            <span className="text-muted">{t('recenzie.filter_aktivny')}</span>
            <Link href="/recenzie" className="text-accent text-xs font-semibold hover:underline">{t('recenzie.zrusit_filter')}</Link>
            <Link href="/recenzie/filter" className="text-accent text-xs font-semibold hover:underline">{t('recenzie.upravit_filter')}</Link>
          </div>
        )}
      </div>

      {allGenres.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-8">
          <div className="flex gap-2 flex-wrap flex-1">
            <Link href="/recenzie" className={`text-xs font-semibold px-3.5 py-1.5 rounded-full border ${!genreFilter && !hasAdvancedFilter ? 'bg-night text-white border-night' : 'text-muted border-line hover:border-night'}`}>
              {t('recenzie.vsetky')}
            </Link>
            {allGenres.map((g) => (
              <Link key={g} href={`/recenzie?genre=${encodeURIComponent(g)}`} className={`text-xs font-semibold px-3.5 py-1.5 rounded-full border ${genreFilter === g ? 'bg-night text-white border-night' : 'text-muted border-line hover:border-night'}`}>
                {g}
              </Link>
            ))}
          </div>

          <SortDropdown />

          <Link
            href="/recenzie/filter"
            className="group flex items-center gap-3 flex-none bg-card border border-line rounded-xl px-4 py-2.5 hover:border-accent transition-colors"
          >
            <div>
              <div className="text-sm font-bold text-ink group-hover:text-accent transition-colors">{t('recenzie.pokrocile_vyhladavanie')}</div>
              <div className="text-[11px] text-muted">{t('recenzie.pokrocile_popis')}</div>
            </div>
            <span className="w-8 h-8 rounded-full bg-surface group-hover:bg-accent flex items-center justify-center flex-none transition-colors">
              <IconChevronRight className="w-4 h-4 text-ink group-hover:text-white transition-colors" />
            </span>
          </Link>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="border border-line rounded-xl p-8 text-center text-muted bg-surface">
          <div className="font-display text-xl font-bold text-ink mb-2">{t('recenzie.nic_najdene')}</div>
          <p className="max-w-md mx-auto">{t('recenzie.nic_najdene_popis')}</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-5 gap-y-9">
            {paged.map((m) => (
              <MovieCard key={m.id} movie={{ title: m.title, slug: m.slug, poster: m.poster, year: m.year, percent: m.percent, ratingCount: m.ratings.length, genre: m.genreList[0] || null, hasSubtitles: m.hasSubtitles, hasDubbing: m.hasDubbing, releaseDate: m.releaseDate, isCamVersion: m.isCamVersion }} />
            ))}
          </div>
          {totalPages > 1 && (
            <div className="mt-10">
              <Pagination page={page} totalPages={totalPages} basePath={basePath} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
