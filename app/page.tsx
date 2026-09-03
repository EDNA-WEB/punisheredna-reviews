import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { publishedNewsFilter } from '@/lib/publishedFilter';
import { youtubeVideoId } from '@/lib/markdown';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import TrailerCarousel from '@/components/TrailerCarousel';
import PremieresList from '@/components/PremieresList';
import MovieMiniList from '@/components/MovieMiniList';
import ReviewPreviewCard from '@/components/ReviewPreviewCard';
import PersonMiniGrid from '@/components/PersonMiniGrid';
import TopVideosList from '@/components/TopVideosList';
import TopVisitedUsersList from '@/components/TopVisitedUsersList';
import { getVerifiedCriticIds } from '@/lib/criticStatus';
import { getDictionary, getUserLanguage } from '@/lib/i18n';
import { cookies } from 'next/headers';
import { parseConsentCookie, isConsentGranted } from '@/lib/privacyDefaults';
import { getRecommendationsForUser } from '@/lib/recommendations';
import MovieCard from '@/components/MovieCard';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const session = await getServerSession(authOptions);
  const viewerId = (session?.user as any)?.id;
  const language = await getUserLanguage();
  const dict = await getDictionary(language);
  const t = (key: string) => dict[key] || key;

  const [trailerVideos, news, latestReviews, popularMovies, recentMovies, popularSeries, following] = await Promise.all([
    prisma.movieVideo.findMany({
      where: { category: 'trailer', featuredOnHome: true, episodeId: null, seasonId: null, movie: { approved: true } },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: {
        movie: { select: { title: true, poster: true } },
        subtitles: { orderBy: { startTime: 'asc' }, select: { startTime: true, endTime: true, text: true } },
        _count: { select: { subtitles: true } }
      }
    }),
    prisma.newsPost.findMany({ where: publishedNewsFilter(), orderBy: { createdAt: 'desc' }, take: 5 }),
    prisma.review.findMany({
      where: { movie: { approved: true }, seasonId: null, episodeId: null },
      orderBy: { createdAt: 'desc' },
      take: 8,
      include: {
        movie: { include: { ratings: { where: { seasonId: null, episodeId: null } } } },
        author: { select: { id: true, name: true, avatar: true, membershipUntil: true } }
      }
    }),
    prisma.movie.findMany({
      where: { approved: true },
      orderBy: { ratings: { _count: 'desc' } },
      take: 7,
      select: { id: true, title: true, slug: true, year: true, poster: true, genres: true, countries: true }
    }),
    prisma.movie.findMany({
      where: { approved: true },
      orderBy: { createdAt: 'desc' },
      take: 7,
      select: { id: true, title: true, slug: true, year: true, poster: true, genres: true, countries: true }
    }),
    prisma.movie.findMany({
      where: { approved: true, contentType: 'Seriál' },
      orderBy: { ratings: { _count: 'desc' } },
      take: 5,
      select: { id: true, title: true, slug: true, year: true, poster: true, genres: true, countries: true }
    }),
    viewerId ? prisma.follow.findMany({ where: { followerId: viewerId }, select: { followingId: true } }) : []
  ]);

  const recommendations = viewerId ? await getRecommendationsForUser(viewerId) : { movies: [], topGenres: [] };

  const trailers = [...trailerVideos]
    .sort((a, b) => {
      const aHas = a._count.subtitles > 0 ? 1 : 0;
      const bHas = b._count.subtitles > 0 ? 1 : 0;
      if (aHas !== bHas) return bHas - aHas;
      return b.createdAt.getTime() - a.createdAt.getTime();
    })
    .slice(0, 5)
    .map((v) => ({
      id: v.id,
      title: v.title || v.movie.title,
      youtubeUrl: v.url,
      youtubeId: youtubeVideoId(v.url),
      subtitles: v.subtitles,
      posterImage: v.previewImage || v.movie.poster
    }))
    .filter((v) => v.youtubeId) as {
    id: string;
    title: string;
    youtubeUrl: string;
    youtubeId: string;
    subtitles: { startTime: number; endTime: number; text: string }[];
    posterImage: string | null;
  }[];

  const consent = parseConsentCookie(cookies().get('privacy_consent')?.value);
  const personalizationAllowed = isConsentGranted(consent, 'personalization');

  const followingIds = following.map((f) => f.followingId);
  const favoriteReviews = followingIds.length && personalizationAllowed
    ? await prisma.review.findMany({
        where: { authorId: { in: followingIds }, movie: { approved: true }, seasonId: null, episodeId: null },
        orderBy: { createdAt: 'desc' },
        take: 8,
        include: {
          movie: { include: { ratings: { where: { seasonId: null, episodeId: null } } } },
          author: { select: { id: true, name: true, avatar: true, membershipUntil: true } }
        }
      })
    : [];

  const verifiedCriticIds = await getVerifiedCriticIds();
  const criticReviews = verifiedCriticIds.size
    ? await prisma.review.findMany({
        where: { authorId: { in: Array.from(verifiedCriticIds) }, movie: { approved: true }, seasonId: null, episodeId: null },
        orderBy: { createdAt: 'desc' },
        take: 8,
        include: {
          movie: { include: { ratings: { where: { seasonId: null, episodeId: null } } } },
          author: { select: { id: true, name: true, avatar: true, membershipUntil: true } }
        }
      })
    : [];

  const [topActors, topCreators] = await Promise.all([
    prisma.person.findMany({
      where: { role: 'ACTOR', approved: true },
      orderBy: { followers: { _count: 'desc' } },
      take: 8,
      select: { id: true, name: true, slug: true, photo: true }
    }),
    prisma.person.findMany({
      where: { role: 'CREATOR', approved: true },
      orderBy: { followers: { _count: 'desc' } },
      take: 8,
      select: { id: true, name: true, slug: true, photo: true }
    })
  ]);

  const firstGenre = (g: string | null) => (g || '').split(',').map((x) => x.trim()).filter(Boolean)[0] || null;

  return (
    <div className="pt-6">
      <div className="lg:flex lg:gap-6 lg:items-stretch mb-12">
        <div className="w-full lg:w-[576px] lg:flex-none">
          <TrailerCarousel trailers={trailers} />
        </div>
        <div className="hidden lg:block flex-1 min-w-0 mt-6 lg:mt-0">
          <PremieresList />
        </div>
      </div>

      {recommendations.movies.length > 0 && (
        <div className="mb-12">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-display font-extrabold text-xl text-ink">Odporúčame pre teba</h2>
              <p className="text-xs text-muted mt-0.5">
                Podľa toho, čo si doteraz hodnotil vysoko — najmä {recommendations.topGenres.join(', ').toLowerCase()}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-5 gap-y-9">
            {recommendations.movies.map((m) => (
              <MovieCard
                key={m.id}
                movie={{
                  title: m.title,
                  slug: m.slug,
                  poster: m.poster,
                  year: m.year,
                  percent: m.percent,
                  ratingCount: m.ratings.length,
                  genre: (m.genres || '').split(',')[0]?.trim() || null,
                  hasSubtitles: m.hasSubtitles,
                  hasDubbing: m.hasDubbing,
                  releaseDate: m.releaseDate
                }}
              />
            ))}
          </div>
        </div>
      )}

      <div className="lg:hidden mb-12">
        <PremieresList />
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-12">
        <div className="border border-line rounded-xl p-4 bg-card">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display font-bold text-sm text-ink">{t('home.novinky')}</h3>
            <Link href="/novinky" className="text-[11px] font-semibold text-white bg-accent px-2.5 py-1 rounded-full hover:bg-accent-dark">
              viac
            </Link>
          </div>

          {news.length === 0 ? (
            <p className="text-sm text-muted">Zatiaľ žiadne novinky.</p>
          ) : (
            <div className="space-y-4">
              {news.map((n) => (
                <Link key={n.id} href={`/news/${n.slug}`} className="flex gap-3 group">
                  <div
                    className="w-20 h-20 rounded-lg bg-surface bg-cover bg-center flex-none"
                    style={n.coverImage ? { backgroundImage: `url('${n.coverImage}')` } : undefined}
                  />
                  <div className="min-w-0">
                    <div className="text-[11px] text-muted mb-0.5">
                      {new Date(n.createdAt).toLocaleDateString('sk-SK')}
                    </div>
                    <h4 className="text-sm font-semibold text-ink leading-snug group-hover:text-accent transition-colors line-clamp-2">
                      {n.title}
                    </h4>
                    <p className="text-xs text-muted line-clamp-2 mt-0.5">{n.summary}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="border border-line rounded-xl p-4 bg-card">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display font-bold text-sm text-ink">{t('home.najsledovanejsie_serialy')}</h3>
            <Link href="/recenzie/filter" className="text-[11px] font-semibold text-white bg-accent px-2.5 py-1 rounded-full hover:bg-accent-dark">
              viac
            </Link>
          </div>

          {popularSeries.length === 0 ? (
            <p className="text-sm text-muted">Zatiaľ žiadne seriály.</p>
          ) : (
            <div className="space-y-4">
              {popularSeries.map((s) => {
                const g = firstGenre(s.genres);
                return (
                  <Link key={s.id} href={`/movie/${s.slug}`} className="flex gap-3 group">
                    <div
                      className="w-20 h-20 rounded-lg bg-surface bg-cover bg-center flex-none"
                      style={s.poster ? { backgroundImage: `url('${s.poster}')` } : undefined}
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {g && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-surface border border-line text-muted">
                            {g}
                          </span>
                        )}
                        {s.year && <span className="text-[11px] text-muted">{s.year}</span>}
                      </div>
                      <h4 className="text-sm font-semibold text-ink leading-snug group-hover:text-accent transition-colors line-clamp-2">
                        {s.title}
                      </h4>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-5">
        <MovieMiniList
          title={t('home.najsledovanejsie_filmy')}
          items={popularMovies.map((m) => ({ id: m.id, title: m.title, slug: m.slug, year: m.year, poster: m.poster, genre: firstGenre(m.genres), country: m.countries }))}
        />
        <MovieMiniList
          title={t('home.naposledy_pridane')}
          items={recentMovies.map((m) => ({ id: m.id, title: m.title, slug: m.slug, year: m.year, poster: m.poster, genre: firstGenre(m.genres), country: m.countries }))}
        />
      </div>

      {latestReviews.length > 0 && (
        <div className="mt-12 border border-line rounded-xl bg-card p-4 sm:p-5">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-display font-bold text-base text-ink">{t('home.nove_recenzie')}</h2>
            <Link href="/recenzie/nove" className="text-[11px] font-semibold text-white bg-accent px-2.5 py-1 rounded-full hover:bg-accent-dark">
              viac
            </Link>
          </div>
          <div className="flex sm:grid sm:grid-cols-4 gap-4 overflow-x-auto sm:overflow-visible snap-x snap-mandatory pb-1">
            {latestReviews.slice(0, 4).map((r) => {
              const myRating = r.movie.ratings.find((rt) => rt.userId === r.authorId);
              return (
                <div key={r.id} className="flex-none w-[78%] sm:w-auto snap-start">
                <ReviewPreviewCard
                  slug={r.movie.slug}
                  body={r.body}
                  author={r.author}
                  rating={myRating?.value || 0}
                  movieTitle={r.movie.title}
                  movieYear={r.movie.year}
                  moviePoster={r.movie.poster}
                />
                </div>
              );
            })}
          </div>
        </div>
      )}
      {favoriteReviews.length > 0 && (
        <div className="mt-8 border border-line rounded-xl bg-card p-4 sm:p-5">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-display font-bold text-base text-ink">{t('home.recenzie_oblubenych')}</h2>
            <Link href="/recenzie/oblubencov" className="text-[11px] font-semibold text-white bg-accent px-2.5 py-1 rounded-full hover:bg-accent-dark">
              viac
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {favoriteReviews.slice(0, 4).map((r) => {
              const myRating = r.movie.ratings.find((rt) => rt.userId === r.authorId);
              return (
                <ReviewPreviewCard
                  key={r.id}
                  slug={r.movie.slug}
                  body={r.body}
                  author={r.author}
                  rating={myRating?.value || 0}
                  movieTitle={r.movie.title}
                  movieYear={r.movie.year}
                  moviePoster={r.movie.poster}
                />
              );
            })}
          </div>
        </div>
      )}
      {criticReviews.length > 0 && (
        <div className="mt-8 border border-line rounded-xl bg-card p-4 sm:p-5">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-display font-bold text-base text-ink">{t('home.recenzie_kritikov')}</h2>
            <Link href="/recenzie/kritici" className="text-[11px] font-semibold text-white bg-accent px-2.5 py-1 rounded-full hover:bg-accent-dark">
              viac
            </Link>
          </div>
          <div className="flex sm:grid sm:grid-cols-4 gap-4 overflow-x-auto sm:overflow-visible snap-x snap-mandatory pb-1">
            {criticReviews.slice(0, 4).map((r) => {
              const myRating = r.movie.ratings.find((rt) => rt.userId === r.authorId);
              return (
                <div key={r.id} className="flex-none w-[78%] sm:w-auto snap-start">
                <ReviewPreviewCard
                  slug={r.movie.slug}
                  body={r.body}
                  author={r.author}
                  rating={myRating?.value || 0}
                  movieTitle={r.movie.title}
                  movieYear={r.movie.year}
                  moviePoster={r.movie.poster}
                  showCriticBadge
                />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {(topActors.length > 0 || topCreators.length > 0) && (
        <div className="mt-8 grid gap-6 min-w-0">
          <PersonMiniGrid title={t('home.najsledovanejsi_herci')} items={topActors} moreHref="/herci" />
          <PersonMiniGrid title={t('home.najsledovanejsi_tvorcovia')} items={topCreators} moreHref="/tvorcovia" />
        </div>
      )}

      <div className="mt-8 grid sm:grid-cols-2 gap-4">
        <TopVideosList />
        <TopVisitedUsersList />
      </div>
    </div>
  );
}
