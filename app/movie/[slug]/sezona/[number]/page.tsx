import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { computePercent, scoreColorStyle } from '@/lib/rating';
import { getCastDetails } from '@/lib/castDetails';
import { mdToHtml, youtubeVideoId } from '@/lib/markdown';
import { displayUserName } from '@/lib/deletedUser';
import EntityRatingWidget from '@/components/EntityRatingWidget';
import WatchedEyeToggle from '@/components/WatchedEyeToggle';
import YouTubeSubtitlePlayer from '@/components/YouTubeSubtitlePlayer';
import SeasonEpisodeQuickActionsBar from '@/components/SeasonEpisodeQuickActionsBar';
import FlagCZ from '@/components/FlagCZ';
import MovieTabsSection from '@/components/MovieTabsSection';
import MovieGoToTabButton from '@/components/MovieGoToTabButton';
import MovieGallery from '@/components/MovieGallery';
import MovieVideoTabs from '@/components/MovieVideoTabs';
import OnlineEpisodeBrowser from '@/components/OnlineEpisodeBrowser';
import PersonNameList from '@/components/PersonNameList';
import ReactionButtons from '@/components/ReactionButtons';
import ExpandableReviewBody from '@/components/ExpandableReviewBody';
import CollapsibleReviewComments from '@/components/CollapsibleReviewComments';
import MovieDiscussionSection from '@/components/MovieDiscussionSection';
import { IconUser, IconClock, IconChevronLeft, IconChevronRight } from '@/components/Icons';
import CriticBadge from '@/components/CriticBadge';
import StarRating from '@/components/StarRating';

export const dynamic = 'force-dynamic';

const t = (k: string) => k;

export async function generateMetadata({ params }: { params: { slug: string; number: string } }): Promise<Metadata> {
  const movie = await prisma.movie.findUnique({ where: { slug: params.slug }, select: { title: true, poster: true } });
  if (!movie) return {};
  const title = `${movie.title} — Séria ${params.number}`;
  const description = `Hodnotenia, recenzie a epizódy série ${params.number} seriálu ${movie.title} na PunisherEDNA reviews.`;
  return {
    title,
    description,
    openGraph: { title, description, images: movie.poster ? [{ url: movie.poster }] : undefined }
  };
}

export default async function SeasonPage({ params }: { params: { slug: string; number: string } }) {
  const session = await getServerSession(authOptions);
  const viewerId = (session?.user as any)?.id;
  const viewer = viewerId ? await prisma.user.findUnique({ where: { id: viewerId }, select: { membershipUntil: true } }) : null;
  const isMember = !!(viewer?.membershipUntil && viewer.membershipUntil > new Date());
  const isAdmin = (session?.user as any)?.role === 'ADMIN';

  const movie = await prisma.movie.findUnique({
    where: { slug: params.slug },
    include: {
      photos: { where: { episodeId: null }, orderBy: { order: 'asc' }, select: { id: true, thumbnail: true } },
      trivia: { orderBy: { order: 'asc' } }
    }
  });
  if (!movie) return notFound();

  const season = await prisma.season.findUnique({
    where: { movieId_number: { movieId: movie.id, number: Number(params.number) } },
    include: {
      episodes: { orderBy: { number: 'asc' }, include: { ratings: true } },
      videos: { where: { episodeId: null }, orderBy: { order: 'asc' }, include: { subtitles: { orderBy: { startTime: 'asc' } } } },
      ratings: { where: { episodeId: null } },
      reviews: {
        where: { episodeId: null },
        orderBy: { createdAt: 'desc' },
        include: {
          author: { select: { id: true, name: true, avatar: true, role: true, membershipUntil: true } },
          likes: true,
          comments: {
            where: { parentId: null },
            orderBy: { createdAt: 'asc' },
            include: {
              user: { select: { name: true, role: true, avatar: true } },
              likes: true,
              replies: { orderBy: { createdAt: 'asc' }, include: { user: { select: { name: true, role: true, avatar: true } }, likes: true } }
            }
          }
        }
      }
    }
  });
  if (!season) return notFound();

  const watchedEpisodeIds = viewerId
    ? new Set(
        (
          await prisma.watchedEpisode.findMany({
            where: { userId: viewerId, episode: { seasonId: season.id } },
            select: { episodeId: true }
          })
        ).map((w) => w.episodeId)
      )
    : new Set<string>();
  const allEpisodesWatched = season.episodes.length > 0 && season.episodes.every((e) => watchedEpisodeIds.has(e.id));

  const [prevSeason, nextSeason] = await Promise.all([
    prisma.season.findFirst({ where: { movieId: movie.id, number: { lt: season.number } }, orderBy: { number: 'desc' }, select: { number: true, year: true } }),
    prisma.season.findFirst({ where: { movieId: movie.id, number: { gt: season.number } }, orderBy: { number: 'asc' }, select: { number: true, year: true } })
  ]);

  const people = await prisma.person.findMany({ select: { name: true, slug: true } });
  const slugByName = new Map(people.map((p) => [p.name, p.slug]));
  const cast = (movie.cast || '').split(',').map((c) => c.trim()).filter(Boolean);
  const genres = movie.genres ? movie.genres.split(',').map((g) => g.trim()) : [];

  const castDetails = await getCastDetails(cast);

  const percent = computePercent(season.ratings);
  const authorRatingByUserId = new Map(season.ratings.map((r) => [r.userId, r.value]));
  const myRating = viewerId ? season.ratings.find((r) => r.userId === viewerId)?.value || 0 : 0;

  // Odporúčané hodnotenie série = priemer vlastných hodnotení jej epizód (ak nejaké má) —
  // používateľ ho len potvrdí kliknutím, alebo dá iné.
  const myEpisodeRatings = viewerId
    ? season.episodes.flatMap((e) => e.ratings.filter((r) => r.userId === viewerId).map((r) => r.value))
    : [];
  const suggestedRating =
    myEpisodeRatings.length > 0
      ? Math.round((myEpisodeRatings.reduce((sum, v) => sum + v, 0) / myEpisodeRatings.length) * 2) / 2
      : undefined;
  const myReview = viewerId ? season.reviews.find((r) => r.authorId === viewerId) : null;
  const myRatingForActions = viewerId ? season.ratings.find((r) => r.userId === viewerId)?.value || 0 : 0;
  const isInWatchlist = viewerId
    ? !!(await prisma.watchlistItem.findUnique({ where: { userId_movieId: { userId: viewerId, movieId: movie.id } } }))
    : false;
  const isInFavorites = viewerId
    ? !!(await prisma.movieListItem.findFirst({ where: { movieId: movie.id, list: { authorId: viewerId, title: 'Obľúbené' } } }))
    : false;

  const videoGroups = [
    { key: 'trailer', label: 'Trailery' },
    { key: 'tv_spot', label: 'TV spoty' },
    { key: 'ukazka', label: 'Ukážky z filmu' }
  ].map((g) => ({
    ...g,
    videos: season.videos
      .filter((v) => v.category === g.key)
      .map((v) => ({ id: v.id, title: v.title, youtubeId: youtubeVideoId(v.url), subtitles: v.subtitles }))
      .filter((v) => v.youtubeId) as { id: string; title: string | null; youtubeId: string; subtitles: any[] }[]
  }));
  const totalVideosCount = videoGroups.reduce((n, g) => n + g.videos.length, 0);
  const primaryVideo = videoGroups.find((g) => g.key === 'trailer')?.videos[0] || videoGroups.flatMap((g) => g.videos)[0] || null;

  const [discussionComments, isFollowingDiscussion] = await Promise.all([
    prisma.comment.findMany({
      where: { movieId: movie.id, parentId: null },
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { name: true, role: true, avatar: true } },
        likes: true,
        replies: { orderBy: { createdAt: 'asc' }, include: { user: { select: { name: true, role: true, avatar: true } }, likes: true } }
      }
    }),
    viewerId
      ? prisma.movieDiscussionFollow.findUnique({ where: { userId_movieId: { userId: viewerId, movieId: movie.id } } }).then((f) => !!f)
      : false
  ]);
  const discussionCommentsSerialized = discussionComments.map((c) => ({
    ...c,
    createdAt: c.createdAt.toISOString(),
    replies: c.replies.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() }))
  }));

  function renderReviewCard(review: NonNullable<typeof season>['reviews'][number], withComments: boolean) {
    if (!movie || !season) return null;
    return (
      <div>
        <div className="flex items-center gap-3 mb-3 flex-wrap">
          <Link href={`/profile/${review.author.id}`} className="flex items-center gap-2 font-semibold text-ink hover:text-accent">
            {review.author.avatar ? (
              <img src={review.author.avatar} alt={review.author.name} className="w-7 h-7 rounded-full object-cover" />
            ) : (
              <IconUser className="w-5 h-5" />
            )}
            {displayUserName(review.author.name, t)}
          </Link>
          {review.author.role === 'ADMIN' && <CriticBadge size="w-4 h-4" label={false} />}
          {authorRatingByUserId.has(review.authorId) && <StarRating rating={authorRatingByUserId.get(review.authorId)!} size="w-4 h-4" />}
          <span className="text-xs text-muted flex items-center gap-1.5 ml-auto">
            <IconClock className="w-3.5 h-3.5" />
            {new Date(review.createdAt).toLocaleDateString('sk-SK', { day: 'numeric', month: 'long', year: 'numeric' })}
          </span>
        </div>

        <div className="mb-3"><ExpandableReviewBody html={mdToHtml(review.body)} plainText={review.body} /></div>

        {review.authorId !== viewerId && (
          <div className="flex items-center gap-3 mb-3">
            <ReactionButtons
              target={{ reviewId: review.id }}
              initialMyValue={review.likes.find((l) => l.userId === viewerId)?.value || 0}
              initialLikeCount={review.likes.filter((l) => l.value === 1).length}
              initialDislikeCount={review.likes.filter((l) => l.value === -1).length}
            />
          </div>
        )}

        {withComments && (
          <CollapsibleReviewComments
            reviewId={review.id}
            totalCount={review.comments.reduce((n, c) => n + 1 + c.replies.length, 0)}
            comments={review.comments.map((c) => ({
              ...c,
              createdAt: c.createdAt.toISOString(),
              replies: c.replies.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() }))
            }))}
            viewerId={viewerId}
            isAdmin={isAdmin}
          />
        )}
      </div>
    );
  }

  return (
    <div className="grid md:grid-cols-[1fr_260px] gap-8 mb-8">
      <div className="min-w-0">
        <div className="sm:hidden mb-5 border border-line rounded-xl">
          <div className="bg-surface px-4 py-3 rounded-t-xl">
            <Link
              href={`/movie/${movie.slug}`}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink border border-line rounded-full px-3 py-1.5 hover:border-accent hover:text-accent transition-colors mb-2"
            >
              <IconChevronLeft className="w-3.5 h-3.5" />
              {movie.title}
            </Link>
            <h1 className="font-display font-extrabold text-2xl text-ink leading-tight">Séria {season.number}</h1>
            {movie.originalTitle && movie.originalTitle !== movie.title && (
              <div className="flex items-center gap-1.5 mt-1">
                <FlagCZ />
                <span className="text-base font-semibold text-ink">{movie.title}</span>
              </div>
            )}
          </div>

          <div className="p-4">
            <div className={`relative flex gap-3 mb-3 w-full min-w-0 overflow-hidden ${!primaryVideo ? 'justify-center' : ''}`}>
              <div className={`flex-none rounded-xl overflow-hidden shadow-xl border border-line aspect-[2/3] bg-surface ${primaryVideo ? 'w-32' : 'w-44'}`}>
                {movie.poster && <img src={movie.poster} alt={movie.title} className="w-full h-full object-cover" />}
                {viewerId && season.episodes.length > 0 && (
                  <div className="absolute top-2 right-2">
                    <WatchedEyeToggle apiBase={`/api/seasons/${season.id}`} initialWatched={allEpisodesWatched} />
                  </div>
                )}
              </div>
              {primaryVideo && (
                <div className="relative flex-1 min-w-0 rounded-xl overflow-hidden border border-line bg-black aspect-video">
                  <YouTubeSubtitlePlayer videoId={primaryVideo.youtubeId} subtitles={primaryVideo.subtitles} fill />
                </div>
              )}
            </div>

            {genres.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {genres.map((g) => (
                  <span key={g} className="text-xs font-semibold text-ink bg-surface border border-line px-2.5 py-1 rounded-full">
                    {g}
                  </span>
                ))}
              </div>
            )}

            <div className="text-sm text-muted mb-3">{[movie.countries, season.year].filter(Boolean).join(' · ')}</div>

            {!season.released && (
              <div className="inline-block bg-surface border border-line text-ink text-xs font-semibold px-3 py-1.5 rounded-full mb-3">
                {season.releaseDate ? `Vyjde ${season.releaseDate.toLocaleDateString('sk-SK', { day: 'numeric', month: 'long', year: 'numeric' })}` : 'Ešte nevyšla'}
              </div>
            )}

            <div className="space-y-1 text-sm">
              {movie.director && (
                <div><span className="text-muted">Réžia: </span><span className="text-ink font-medium"><PersonNameList names={movie.director.split(',').map((x) => x.trim())} slugByName={slugByName} /></span></div>
              )}
              {cast.length > 0 && (
                <div><span className="text-muted">Hrajú: </span><span className="text-ink font-medium"><PersonNameList names={cast} slugByName={slugByName} /></span></div>
              )}
            </div>
          </div>

          <div className="px-4 pb-4">
            <SeasonEpisodeQuickActionsBar
              reviewApiBase={`/api/seasons/${season.id}`}
              reviewTitle={`${movie.title} — Séria ${season.number}`}
              myReviewId={myReview?.id || null}
              myReviewBody={myReview?.body || ''}
              myReviewRating={myRatingForActions}
              movieId={movie.id}
              movieTitle={movie.title}
              movieYear={movie.year}
              initialInWatchlist={isInWatchlist}
              initialInFavorites={isInFavorites}
              isLoggedIn={!!viewerId}
            />
          </div>
        </div>

        <div className="hidden sm:block mb-4 border border-line rounded-xl p-4">
          <div className="flex gap-5 items-start">
          <div className="relative w-32 sm:w-40 flex-none rounded-xl overflow-hidden shadow-xl border border-line aspect-[2/3] bg-surface">
            <div
              className="w-full h-full bg-surface bg-cover bg-center"
              style={movie.poster ? { backgroundImage: `url('${movie.poster}')` } : undefined}
            />
            {viewerId && season.episodes.length > 0 && (
              <div className="absolute top-2 right-2">
                <WatchedEyeToggle apiBase={`/api/seasons/${season.id}`} initialWatched={allEpisodesWatched} />
              </div>
            )}
          </div>
          <div className="min-w-0 pt-1 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <Link
                href={`/movie/${movie.slug}`}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink border border-line rounded-full px-3 py-1.5 hover:border-accent hover:text-accent transition-colors"
              >
                <IconChevronLeft className="w-3.5 h-3.5" />
                {movie.title}
              </Link>

              <div className="flex items-center gap-1.5 ml-auto">
                {prevSeason ? (
                  <Link
                    href={`/movie/${movie.slug}/sezona/${prevSeason.number}`}
                    title={`Séria ${prevSeason.number}${prevSeason.year ? ` · ${prevSeason.year}` : ''}`}
                    aria-label="Predchádzajúca séria"
                    className="w-8 h-8 rounded-full border border-line flex items-center justify-center text-ink hover:border-accent hover:text-accent transition-colors"
                  >
                    <IconChevronLeft className="w-4 h-4" />
                  </Link>
                ) : (
                  <span className="w-8 h-8 rounded-full border border-line flex items-center justify-center text-line">
                    <IconChevronLeft className="w-4 h-4" />
                  </span>
                )}
                {nextSeason ? (
                  <Link
                    href={`/movie/${movie.slug}/sezona/${nextSeason.number}`}
                    title={`Séria ${nextSeason.number}${nextSeason.year ? ` · ${nextSeason.year}` : ''}`}
                    aria-label="Nasledujúca séria"
                    className="w-8 h-8 rounded-full border border-line flex items-center justify-center text-ink hover:border-accent hover:text-accent transition-colors"
                  >
                    <IconChevronRight className="w-4 h-4" />
                  </Link>
                ) : (
                  <span className="w-8 h-8 rounded-full border border-line flex items-center justify-center text-line">
                    <IconChevronRight className="w-4 h-4" />
                  </span>
                )}
              </div>
            </div>
            <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-ink leading-tight mt-3">
              {movie.title} — Séria {season.number}
            </h1>

            {genres.length > 0 && (
              <div className="flex flex-wrap gap-1.5 my-3">
                {genres.map((g) => (
                  <span key={g} className="text-xs font-semibold text-ink bg-surface border border-line px-2.5 py-1 rounded-full">
                    {g}
                  </span>
                ))}
              </div>
            )}

            <div className="text-sm text-muted mb-3">{[movie.countries, season.year].filter(Boolean).join(' · ')}</div>

            {!season.released && (
              <div className="inline-block bg-surface border border-line text-ink text-xs font-semibold px-3 py-1.5 rounded-full mb-3">
                {season.releaseDate ? `Vyjde ${season.releaseDate.toLocaleDateString('sk-SK', { day: 'numeric', month: 'long', year: 'numeric' })}` : 'Ešte nevyšla'}
              </div>
            )}

            <div className="space-y-1 text-sm">
              {movie.director && (
                <div><span className="text-muted">Réžia: </span><span className="text-ink font-medium"><PersonNameList names={movie.director.split(',').map((x) => x.trim())} slugByName={slugByName} /></span></div>
              )}
              {movie.screenplay && (
                <div><span className="text-muted">Scenár: </span><span className="text-ink font-medium"><PersonNameList names={movie.screenplay.split(',').map((x) => x.trim())} slugByName={slugByName} /></span></div>
              )}
              {cast.length > 0 && (
                <div><span className="text-muted">Hrajú: </span><span className="text-ink font-medium"><PersonNameList names={cast} slugByName={slugByName} /></span></div>
              )}
            </div>
          </div>
          </div>

          <div className="w-full">
            <SeasonEpisodeQuickActionsBar
              reviewApiBase={`/api/seasons/${season.id}`}
              reviewTitle={`${movie.title} — Séria ${season.number}`}
              myReviewId={myReview?.id || null}
              myReviewBody={myReview?.body || ''}
              myReviewRating={myRatingForActions}
              movieId={movie.id}
              movieTitle={movie.title}
              movieYear={movie.year}
              initialInWatchlist={isInWatchlist}
              initialInFavorites={isInFavorites}
              isLoggedIn={!!viewerId}
            />
          </div>
        </div>

        <MovieTabsSection
          primaryTabs={[
            {
              key: 'prehlad',
              label: 'Prehľad',
              content: (
                <div className="space-y-8">
                  <div>
                    <div className="flex items-center justify-between bg-surface border border-line rounded-t-xl px-4 py-2.5">
                      <span className="text-sm font-bold text-ink">Recenzie{season.reviews.length > 0 ? ` (${season.reviews.length})` : ''}</span>
                      {season.reviews.length > 0 && <MovieGoToTabButton tabKey="recenzie" />}
                    </div>
                    <div className="border border-t-0 border-line rounded-b-xl divide-y divide-line">
                      {season.reviews.length === 0 ? (
                        <p className="text-sm text-muted p-4">Zatiaľ žiadna recenzia.</p>
                      ) : (
                        season.reviews.slice(0, 5).map((review) => (
                          <div key={review.id} className="p-4">{renderReviewCard(review, false)}</div>
                        ))
                      )}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between bg-surface border border-line rounded-t-xl px-4 py-2.5">
                      <span className="text-sm font-bold text-ink">Epizódy ({season.episodes.length})</span>
                      <MovieGoToTabButton tabKey="epizody" />
                    </div>
                    <div className="border border-t-0 border-line rounded-b-xl divide-y divide-line">
                      {season.episodes.slice(0, 5).map((e) => {
                        const epPercent = computePercent(e.ratings);
                        const code = `S${String(season.number).padStart(2, '0')}E${String(e.number).padStart(2, '0')}`;
                        return (
                          <Link
                            key={e.id}
                            href={`/movie/${movie.slug}/sezona/${season.number}/epizoda/${e.number}`}
                            className="flex items-center gap-2.5 px-4 py-3 hover:bg-surface transition-colors min-w-0"
                          >
                            <span
                              className="w-2.5 h-2.5 rounded-[3px] flex-none"
                              style={{ backgroundColor: !season.released ? '#D9D9D9' : epPercent !== null ? scoreColorStyle(epPercent).backgroundColor : '#E8E7E5' }}
                            />
                            <span className="text-sm font-semibold text-ink truncate min-w-0">{e.title || `Epizóda ${e.number}`}</span>
                            <span className="text-xs text-muted flex-none">({code})</span>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )
            },
            {
              key: 'recenzie',
              label: 'Recenzie',
              content: (
                <div>
                  <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
                    <h3 className="font-display font-bold text-xl text-ink">Recenzie {season.reviews.length > 0 && `(${season.reviews.length})`}</h3>
                    {viewerId && season.released && !myReview && (
                      <Link
                        href={`/movie/${movie.slug}/sezona/${season.number}/napisat`}
                        className="text-xs font-bold text-white bg-accent px-3.5 py-1.5 rounded-full hover:bg-accent-dark whitespace-nowrap"
                      >
                        PRIDAŤ RECENZIU
                      </Link>
                    )}
                  </div>
                  {!season.released ? (
                    <p className="text-muted text-sm">Séria ešte nevyšla — recenzie budú dostupné po jej vydaní.</p>
                  ) : season.reviews.length === 0 ? (
                    <p className="text-muted text-sm">K tejto sérii zatiaľ nie je žiadna recenzia.</p>
                  ) : (
                    season.reviews.map((review, i) => (
                      <div key={review.id} className={i < season.reviews.length - 1 ? 'mb-12 pb-10 border-b border-line' : ''}>
                        {renderReviewCard(review, true)}
                      </div>
                    ))
                  )}
                </div>
              )
            },
            {
              key: 'zaujimavosti',
              label: 'Zaujímavosti',
              content:
                movie.trivia.length > 0 ? (
                  <div>
                    <h3 className="font-display font-bold text-xl text-ink mb-5">Zaujímavosti ({movie.trivia.length})</h3>
                    <div className="space-y-3">
                      {movie.trivia.map((tr, i) => (
                        <div key={tr.id} className="flex gap-3 text-sm text-ink">
                          <span className="text-accent font-bold flex-none">{i + 1}.</span>
                          <p>{tr.text}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted">K tomuto seriálu zatiaľ nie sú doplnené žiadne zaujímavosti.</p>
                )
            },
            {
              key: 'epizody',
              label: 'Epizódy',
              content: (
                <div className="border border-line rounded-xl overflow-hidden divide-y divide-line">
                  {season.episodes.map((e) => {
                    const epPercent = computePercent(e.ratings);
                    const code = `S${String(season.number).padStart(2, '0')}E${String(e.number).padStart(2, '0')}`;
                    return (
                      <Link
                        key={e.id}
                        href={`/movie/${movie.slug}/sezona/${season.number}/epizoda/${e.number}`}
                        className="flex items-center gap-2.5 px-4 py-3 bg-card hover:bg-surface transition-colors min-w-0"
                      >
                        <span
                          className="w-2.5 h-2.5 rounded-[3px] flex-none"
                          style={{ backgroundColor: !season.released ? '#D9D9D9' : epPercent !== null ? scoreColorStyle(epPercent).backgroundColor : '#E8E7E5' }}
                        />
                        <span className="text-sm font-semibold text-ink truncate min-w-0">{e.title || `Epizóda ${e.number}`}</span>
                        <span className="text-xs text-muted flex-none">({code})</span>
                        {season.released && epPercent !== null && <span className="text-xs text-muted ml-auto flex-none">{epPercent}%</span>}
                      </Link>
                    );
                  })}
                </div>
              )
            },
            {
              key: 'videa',
              label: 'Videá',
              content:
                totalVideosCount > 0 ? (
                  <MovieVideoTabs groups={videoGroups} />
                ) : (
                  <p className="text-sm text-muted">K tejto sérii zatiaľ nie je nahraté žiadne video.</p>
                )
            },
            {
              key: 'galeria',
              desktopOnly: true,
              label: 'Galéria',
              content:
                movie.photos.length > 0 ? (
                  <MovieGallery movieId={movie.id} photos={movie.photos} noHeading />
                ) : (
                  <p className="text-sm text-muted">K tomuto seriálu zatiaľ nie je nahratá žiadna fotka.</p>
                )
            },
            {
              key: 'online',
              desktopOnly: true,
              label: 'Online',
              content: !viewerId ? (
                <p className="text-sm text-muted">
                  Pre sledovanie filmov sa musíš <Link href="/login" className="text-accent font-semibold hover:underline">Prihlás sa</Link>.
                </p>
              ) : !isMember ? (
                <div className="border border-line rounded-xl p-5 bg-surface flex items-center gap-4">
                  <img src="/golden-ticket-badge.svg" alt="" width={36} height={36} className="flex-none" />
                  <div>
                    <p className="text-sm font-semibold text-ink">Online sledovanie je dostupné len pre Golden Ticket členov.</p>
                    <Link href="/nastavenia/clenstvo" className="text-accent text-sm font-semibold hover:underline">
                      Zistiť viac o členstve →
                    </Link>
                  </div>
                </div>
              ) : !movie.watchUrl && !season.episodes.some((e) => e.onlineUrl) ? (
                <p className="text-sm text-muted">K tomuto seriálu zatiaľ nie je nastavená možnosť sledovania online.</p>
              ) : (
                <OnlineEpisodeBrowser
                  seasons={[
                    {
                      number: season.number,
                      year: season.year,
                      released: season.released,
                      episodes: season.episodes.map((e) => ({
                        number: e.number,
                        title: e.title,
                        onlineImage: e.onlineImage,
                        onlineUrl: e.onlineUrl,
                        watched: watchedEpisodeIds.has(e.id)
                      }))
                    }
                  ]}
                  watchUrl={movie.watchUrl || ''}
                />
              )
            },
          ]}
          moreTabs={[
            {
              key: 'hraju',
              label: 'Hrajú',
              content:
                castDetails.length > 0 ? (
                  <div className="divide-y divide-line border-t border-line">
                    {castDetails.map((actor) => (
                      <div key={actor.name} className="flex gap-4 py-5">
                        <div className="w-16 h-16 rounded-lg bg-surface flex-none overflow-hidden">
                          {actor.photo ? (
                            <img src={actor.photo} alt={actor.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <IconUser className="w-6 h-6 text-muted" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          {actor.slug ? (
                            <Link href={`/osobnost/${actor.slug}`} className="font-display font-bold text-ink hover:text-accent transition-colors">
                              {actor.name}
                            </Link>
                          ) : (
                            <span className="font-display font-bold text-ink">{actor.name}</span>
                          )}
                          {actor.birthPlace && <div className="text-xs text-muted mt-0.5">{actor.birthPlace}</div>}

                          {actor.topMovies.length > 0 && (
                            <div className="mt-2">
                              <div className="text-xs text-muted mb-1">Najlepšie filmy:</div>
                              <div className="space-y-0.5">
                                {actor.topMovies.map((m) => (
                                  <div key={m.slug} className="flex items-center gap-1.5 text-sm">
                                    <span className="w-2 h-2 rounded-sm bg-accent flex-none" />
                                    <Link href={`/movie/${m.slug}`} className="text-accent hover:underline">{m.title}</Link>
                                    <span className="text-muted">· {m.year}</span>
                                    {m.contentType && m.contentType !== 'Film' && <span className="text-muted">· {m.contentType}</span>}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted">K tomuto seriálu zatiaľ nie je doplnené obsadenie.</p>
                )
            },
            {
              key: 'diskusia',
              label: 'Diskusia',
              content: (
                <MovieDiscussionSection
                  movieId={movie.id}
                  comments={discussionCommentsSerialized}
                  viewerId={viewerId}
                  isAdmin={isAdmin}
                  isFollowing={isFollowingDiscussion}
                />
              )
            }
          ]}
        />
      </div>

      <div>
        <div className="border border-line rounded-xl overflow-hidden">
          <div className="text-center py-6 px-4" style={scoreColorStyle(percent)}>
            <div className="font-display font-extrabold text-4xl leading-none">{percent === null ? '—' : `${percent}%`}</div>
            <div className="text-xs opacity-90 mt-1">{season.ratings.length} hlasov</div>
          </div>
          <div className="p-4 bg-card">
            <div className="text-xs font-bold uppercase tracking-wide text-muted mb-2">Moje hodnotenie</div>
            {!season.released ? (
              <p className="text-sm text-muted">Séria ešte nemala premiéru — hodnotiť a písať recenzie sa dá až po jej vydaní.</p>
            ) : viewerId ? (
              <EntityRatingWidget apiBase={`/api/seasons/${season.id}`} initialValue={myRating} suggestedValue={suggestedRating} />
            ) : (
              <p className="text-sm text-muted">
                <Link href="/login" className="text-accent font-semibold hover:underline">Prihlás sa</Link> a ohodnoť sériu.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
