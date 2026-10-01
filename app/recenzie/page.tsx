import Link from 'next/link';
import { isActiveMember } from '@/lib/membership';
import MovieCard from '@/components/MovieCard';
import SortDropdown from '@/components/SortDropdown';
import GenreDropdown from '@/components/GenreDropdown';
import { primaryGenreLabel } from '@/lib/genreLabel';
import { activeFilterCount, getFilterOptions, parseFilter, runFilter } from '@/lib/movieFilter';
import { getDictionary, getUserLanguage } from '@/lib/i18n';
import Pagination from '@/components/Pagination';
import { IconChevronRight } from '@/components/Icons';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

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

export default async function MoviesPage(props: { searchParams: Promise<SearchParams> }) {
  const { searchParams } = { ...props, searchParams: await props.searchParams };
  const dict = await getDictionary(await getUserLanguage());
  const t = (key: string) => dict[key] || key;

  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id || null;
  const isAdmin = (session?.user as any)?.role === 'ADMIN';
  const isMember = isAdmin || (await isActiveMember(userId));

  // Spoločné jadro filtra (rovnaké ako /recenzie/filter a appka) — filtruje
  // CELÝ katalóg v pamäti servera, bez ďalších dopytov do databázy. Rozumie
  // novým aj starým parametrom (genre, country, tag, nowShowing, sort=najnovsie…).
  const page = Math.max(1, Number(searchParams?.page) || 1);
  const genreFilter = searchParams?.genre || null;
  const params = { get: (k: string) => { const v = (searchParams as any)?.[k]; return v === undefined || v === null ? null : String(v); } };
  const spec = parseFilter(params);
  if (!searchParams?.sort) spec.sort = 'newest'; // táto stránka: predvolene najnovšie
  spec.page = page;
  const hasAdvancedFilter = activeFilterCount({ ...spec, genres: genreFilter && !searchParams?.genres ? [] : spec.genres }) > 0;

  const [r, options] = await Promise.all([runFilter(spec, { userId, isMember, pageSize: PAGE_SIZE }), getFilterOptions()]);
  const allGenres = Object.keys(options.genres).sort();
  const filtered = { length: r.total };
  const effectivePage = r.page;
  const visibleTotalPages = r.pages;
  const hitFreeLimit = r.limited && effectivePage >= visibleTotalPages;
  const watchedMovieIds = r.userSets.seen;
  const paged = r.items.map((m) => ({ ...m, genreList: m.genres }));

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
            <Link href={`/recenzie/filter?${qs.toString()}`} className="text-accent text-xs font-semibold hover:underline">{t('recenzie.upravit_filter')}</Link>
          </div>
        )}
      </div>

      {allGenres.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-8">
          <GenreDropdown genres={allGenres} activeGenre={genreFilter} allLabel={t('recenzie.vsetky')} />

          <SortDropdown />

          <Link
            href={qs.toString() ? `/recenzie/filter?${qs.toString()}` : '/recenzie/filter'}
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
              <MovieCard
                key={m.id}
                movie={{
                  title: m.title,
                  slug: m.slug,
                  poster: m.poster,
                  year: m.yearRaw,
                  percent: m.percent,
                  ratingCount: m.ratingCount,
                  genre: primaryGenreLabel(m.genreList),
                  hasSubtitles: m.hasSubtitles,
                  hasDubbing: m.hasDubbing,
                  releaseDate: m.releaseDate ? new Date(m.releaseDate) : null,
                  isCamVersion: m.isCamVersion,
                  contentType: m.contentType,
                  premiereType: m.premiereType,
                  watched: watchedMovieIds.has(m.id)
                }}
              />
            ))}
          </div>
          {visibleTotalPages > 1 && (
            <div className="mt-10">
              <Pagination page={effectivePage} totalPages={visibleTotalPages} basePath={basePath} />
            </div>
          )}
          {hitFreeLimit && (
            <div className="mt-6 border border-line rounded-xl p-5 bg-card flex items-start gap-4">
              <img src="/golden-ticket-badge.svg" alt="" width={36} height={36} className="flex-none" />
              <div>
                <p className="text-sm font-semibold text-ink mb-1">Ďalšie stránky sú dostupné len pre Golden Ticket členov.</p>
                <Link href="/nastavenia/clenstvo" className="text-accent text-sm font-semibold hover:underline">
                  Zjistit více o členství →
                </Link>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
