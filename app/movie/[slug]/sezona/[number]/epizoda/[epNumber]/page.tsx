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
import TagsBox from '@/components/TagsBox';
import EpisodeNoteBox from '@/components/EpisodeNoteBox';
import FlagCZ from '@/components/FlagCZ';
import RatingDistributionChart from '@/components/RatingDistributionChart';
import MovieTabsSection from '@/components/MovieTabsSection';
import MovieGallery from '@/components/MovieGallery';
import PersonNameList from '@/components/PersonNameList';
import ReactionButtons from '@/components/ReactionButtons';
import ExpandableReviewBody from '@/components/ExpandableReviewBody';
import CollapsibleReviewComments from '@/components/CollapsibleReviewComments';
import MovieDiscussionSection from '@/components/MovieDiscussionSection';
import MovieGoToTabButton from '@/components/MovieGoToTabButton';
import { IconUser, IconClock, IconPlay, IconChevronLeft, IconChevronRight } from '@/components/Icons';
import CriticBadge from '@/components/CriticBadge';
import StarRating from '@/components/StarRating';

export const dynamic = 'force-dynamic';

const t = (k: string) => k;

export async function generateMetadata({
  params
}: {
  params: { slug: string; number: string; epNumber: string };
}): Promise<Metadata> {
  const movie = await prisma.movie.findUnique({ where: { slug: params.slug }, select: { title: true, poster: true } });
  if (!movie) return {};
  const code = `S${params.number.padStart(2, '0')}E${params.epNumber.padStart(2, '0')}`;
  const title = `${movie.title} — ${code}`;
  const description = `Hodnotenia a recenzie epizódy ${code} seriálu ${movie.title} na PunisherEDNA reviews.`;
  return {
    title,
    description,
    openGraph: { title, description, images: movie.poster ? [{ url: movie.poster }] : undefined }
  };
}

export default async function EpisodePage({ params }: { params: { slug: string; number: string; epNumber: string } }) {
  const session = await getServerSession(authOptions);
  const viewerId = (session?.user as any)?.id;
  const viewer = viewerId ? await prisma.user.findUnique({ where: { id: viewerId }, select: { membershipUntil: true } }) : null;
  const isMember = !!(viewer?.membershipUntil && viewer.membershipUntil > new Date());
  const isAdmin = (session?.user as any)?.role === 'ADMIN';

  const movie = await prisma.movie.findUnique({
    where: { slug: params.slug },
    include: { trivia: { orderBy: { order: 'asc' } } }
  });
  if (!movie) return notFound();

  const season = await prisma.season.findUnique({
    where: { movieId_number: { movieId: movie.id, number: Number(params.number) } },
    include: { videos: { where: { episodeId: null }, orderBy: { order: 'asc' } } }
  });
  if (!season) return notFound();

  const episode = await prisma.episode.findUnique({
    where: { seasonId_number: { seasonId: season.id, number: Number(params.epNumber) } },
    include: {
      ratings: true,
      photos: { orderBy: { order: 'asc' }, select: { id: true, thumbnail: true } },
      videos: { orderBy: { order: 'asc' } },
      reviews: {
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
  if (!episode) return notFound();

  const isWatched = viewerId
    ? !!(await prisma.watchedEpisode.findFirst({ where: { userId: viewerId, episodeId: episode.id } }))
    : false;

  let prevEpisode: { number: number; title: string | null; seasonNumber: number } | null = null;
  let nextEpisode: { number: number; title: string | null; seasonNumber: number } | null = null;

  const withinSeasonPrev = await prisma.episode.findFirst({
    where: { seasonId: season.id, number: { lt: episode.number } },
    orderBy: { number: 'desc' },
    select: { number: true, title: true }
  });
  if (withinSeasonPrev) {
    prevEpisode = { ...withinSeasonPrev, seasonNumber: season.number };
  } else {
    const prevSeason = await prisma.season.findFirst({
      where: { movieId: movie.id, number: { lt: season.number } },
      orderBy: { number: 'desc' }
    });
    if (prevSeason) {
      const lastEpisode = await prisma.episode.findFirst({
        where: { seasonId: prevSeason.id },
        orderBy: { number: 'desc' },
        select: { number: true, title: true }
      });
      if (lastEpisode) prevEpisode = { ...lastEpisode, seasonNumber: prevSeason.number };
    }
  }

  const withinSeasonNext = await prisma.episode.findFirst({
    where: { seasonId: season.id, number: { gt: episode.number } },
    orderBy: { number: 'asc' },
    select: { number: true, title: true }
  });
  if (withinSeasonNext) {
    nextEpisode = { ...withinSeasonNext, seasonNumber: season.number };
  } else {
    const nextSeason = await prisma.season.findFirst({
      where: { movieId: movie.id, number: { gt: season.number } },
      orderBy: { number: 'asc' }
    });
    if (nextSeason) {
      const firstEpisode = await prisma.episode.findFirst({
        where: { seasonId: nextSeason.id },
        orderBy: { number: 'asc' },
        select: { number: true, title: true }
      });
      if (firstEpisode) nextEpisode = { ...firstEpisode, seasonNumber: nextSeason.number };
    }
  }

  const people = await prisma.person.findMany({ select: { name: true, slug: true } });
  const slugByName = new Map(people.map((p) => [p.name, p.slug]));
  const cast = (movie.cast || '').split(',').map((c) => c.trim()).filter(Boolean);
  const genres = movie.genres ? movie.genres.split(',').map((g) => g.trim()) : [];

  const castDetails = await getCastDetails(cast);

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

  const percent = computePercent(episode.ratings);
  const authorRatingByUserId = new Map(episode.ratings.map((r) => [r.userId, r.value]));
  const myRating = viewerId ? episode.ratings.find((r) => r.userId === viewerId)?.value || 0 : 0;
  const myReview = viewerId ? episode.reviews.find((r) => r.authorId === viewerId) : null;
  const isInWatchlist = viewerId
    ? !!(await prisma.watchlistItem.findUnique({ where: { userId_movieId: { userId: viewerId, movieId: movie.id } } }))
    : false;
  const isInFavorites = viewerId
    ? !!(await prisma.movieListItem.findFirst({ where: { movieId: movie.id, list: { authorId: viewerId, title: 'Obľúbené' } } }))
    : false;
  const myEpisodeNote = viewerId
    ? await prisma.episodeNote.findUnique({ where: { episodeId_userId: { episodeId: episode.id, userId: viewerId } } })
    : null;
  const movieTags = movie.tags
    ? movie.tags.split(',').map((tg) => tg.trim()).filter(Boolean)
    : [];
  const code = `S${String(season.number).padStart(2, '0')}E${String(episode.number).padStart(2, '0')}`;
  const title = episode.title || `Epizóda ${episode.number}`;

  const episodeVideos = episode.videos
    .map((v) => ({ id: v.id, title: v.title, youtubeId: youtubeVideoId(v.url) }))
    .filter((v) => v.youtubeId) as { id: string; title: string | null; youtubeId: string }[];
  const seasonTrailerFallback = season.videos
    .map((v) => ({ id: v.id, title: v.title, youtubeId: youtubeVideoId(v.url), category: v.category }))
    .filter((v) => v.youtubeId && v.category === 'trailer')[0] || null;
  const primaryVideo = episodeVideos[0] || seasonTrailerFallback;
  const tabVideos = episodeVideos.length > 0 ? episodeVideos : (seasonTrailerFallback ? [{ ...seasonTrailerFallback, title: seasonTrailerFallback.title || `Trailer série ${season.number}` }] : []);

  function renderReviewCard(review: NonNullable<typeof episode>['reviews'][number], withComments: boolean) {
    if (!movie || !episode) return null;
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
              href={`/movie/${movie.slug}/sezona/${season.number}`}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink border border-line rounded-full px-3 py-1.5 hover:border-accent hover:text-accent transition-colors mb-2"
            >
              <IconChevronLeft className="w-3.5 h-3.5" />
              {movie.title} — Séria {season.number}
            </Link>
            <h1 className="font-display font-extrabold text-2xl text-ink leading-tight">{title}</h1>
            <div className="text-sm text-muted mt-1">{code}</div>
          </div>

          <div className="p-4">
            <div className={`relative flex gap-3 mb-3 w-full min-w-0 overflow-hidden ${!primaryVideo ? 'justify-center' : ''}`}>
              <div className={`flex-none rounded-xl overflow-hidden shadow-xl border border-line aspect-[2/3] bg-surface ${primaryVideo ? 'w-32' : 'w-44'}`}>
                {movie.poster && <img src={movie.poster} alt={movie.title} className="w-full h-full object-cover" />}
                {viewerId && (
                  <div className="absolute top-2 right-2">
                    <WatchedEyeToggle apiBase={`/api/episodes/${episode.id}`} initialWatched={isWatched} />
                  </div>
                )}
              </div>
              {primaryVideo && (
                <div className="relative flex-1 min-w-0 rounded-xl overflow-hidden border border-line bg-black aspect-video">
                  <YouTubeSubtitlePlayer videoId={primaryVideo.youtubeId} subtitles={[]} fill />
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
                Séria ešte nevyšla
              </div>
            )}

            <div className="space-y-1 text-sm border border-line rounded-xl p-3 bg-surface">
              {movie.director && (
                <div><span className="text-muted">Réžia: </span><span className="text-ink font-medium"><PersonNameList names={movie.director.split(',').map((x) => x.trim())} slugByName={slugByName} /></span></div>
              )}
              {movie.screenplay && (
                <div><span className="text-muted">Scenár: </span><span className="text-ink font-medium"><PersonNameList names={movie.screenplay.split(',').map((x) => x.trim())} slugByName={slugByName} /></span></div>
              )}
              {movie.cinematography && (
                <div><span className="text-muted">Kamera: </span><span className="text-ink font-medium"><PersonNameList names={movie.cinematography.split(',').map((x) => x.trim())} slugByName={slugByName} /></span></div>
              )}
              {movie.music && (
                <div><span className="text-muted">Hudba: </span><span className="text-ink font-medium"><PersonNameList names={movie.music.split(',').map((x) => x.trim())} slugByName={slugByName} /></span></div>
              )}
              {cast.length > 0 && (
                <div><span className="text-muted">Hrajú: </span><span className="text-ink font-medium"><PersonNameList names={cast} slugByName={slugByName} /></span></div>
              )}
            </div>
          </div>

          <div className="px-4 pb-4">
            <SeasonEpisodeQuickActionsBar
              reviewApiBase={`/api/episodes/${episode.id}`}
              reviewTitle={`${movie.title} — ${code} — ${title}`}
              myReviewId={myReview?.id || null}
              myReviewBody={myReview?.body || ''}
              myReviewRating={myRating}
              movieId={movie.id}
              movieTitle={movie.title}
              movieYear={movie.year}
              initialInWatchlist={isInWatchlist}
              initialInFavorites={isInFavorites}
              isLoggedIn={!!viewerId}
            />
          </div>
        </div>

        {/* Mobil — hodnotenie + graf, hneď pod hlavičkou (rovnaký vzor ako pri profile filmu) */}
        <div className="sm:hidden mb-5 border border-line rounded-xl overflow-hidden">
          <div className="text-center py-6 px-4" style={scoreColorStyle(percent)}>
            <div className="font-display font-extrabold text-4xl leading-none">{percent === null ? '—' : `${percent}%`}</div>
            <div className="text-xs opacity-90 mt-1">{episode.ratings.length} hlasov</div>
          </div>
          {episode.ratings.length > 0 && (
            <div className="px-4 pt-4 pb-2 border-b border-line bg-card">
              <RatingDistributionChart values={episode.ratings.map((r) => r.value)} label="Rozloženie hodnotení" />
            </div>
          )}
          <div className="p-4 bg-card">
            <div className="text-xs font-bold uppercase tracking-wide text-muted mb-2">Moje hodnotenie</div>
            {!season.released ? (
              <p className="text-sm text-muted">Séria ešte nemala premiéru — hodnotiť a písať recenzie sa dá až po jej vydaní.</p>
            ) : viewerId ? (
              <EntityRatingWidget apiBase={`/api/episodes/${episode.id}`} initialValue={myRating} />
            ) : (
              <p className="text-sm text-muted">
                <Link href="/login" className="text-accent font-semibold hover:underline">Prihlás sa</Link> a ohodnoť epizódu.
              </p>
            )}
          </div>
        </div>

        <div className="hidden sm:block mb-4 border border-line rounded-xl p-4">
          <div className="flex gap-5 items-start">
          <div className="relative w-32 sm:w-40 flex-none rounded-xl overflow-hidden shadow-xl border border-line aspect-[2/3] bg-surface">
            <div
              className="w-full h-full bg-surface bg-cover bg-center"
              style={movie.poster ? { backgroundImage: `url('${movie.poster}')` } : undefined}
            />
            {viewerId && (
              <div className="absolute top-2 right-2">
                <WatchedEyeToggle apiBase={`/api/episodes/${episode.id}`} initialWatched={isWatched} />
              </div>
            )}
          </div>
          <div className="min-w-0 pt-1 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <Link
                href={`/movie/${movie.slug}/sezona/${season.number}`}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink border border-line rounded-full px-3 py-1.5 hover:border-accent hover:text-accent transition-colors"
              >
                <IconChevronLeft className="w-3.5 h-3.5" />
                {movie.title} — Séria {season.number}
              </Link>

              <div className="flex items-center gap-1.5 ml-auto">
                {prevEpisode ? (
                  <Link
                    href={`/movie/${movie.slug}/sezona/${prevEpisode.seasonNumber}/epizoda/${prevEpisode.number}`}
                    title={`${prevEpisode.seasonNumber !== season.number ? `Séria ${prevEpisode.seasonNumber} · ` : ''}${prevEpisode.title || `Epizóda ${prevEpisode.number}`}`}
                    aria-label="Predchádzajúca epizóda"
                    className="w-8 h-8 rounded-full border border-line flex items-center justify-center text-ink hover:border-accent hover:text-accent transition-colors"
                  >
                    <IconChevronLeft className="w-4 h-4" />
                  </Link>
                ) : (
                  <span className="w-8 h-8 rounded-full border border-line flex items-center justify-center text-line">
                    <IconChevronLeft className="w-4 h-4" />
                  </span>
                )}
                {nextEpisode ? (
                  <Link
                    href={`/movie/${movie.slug}/sezona/${nextEpisode.seasonNumber}/epizoda/${nextEpisode.number}`}
                    title={`${nextEpisode.seasonNumber !== season.number ? `Séria ${nextEpisode.seasonNumber} · ` : ''}${nextEpisode.title || `Epizóda ${nextEpisode.number}`}`}
                    aria-label="Nasledujúca epizóda"
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
            <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-ink leading-tight mt-3">{title}</h1>
            <div className="text-sm text-muted mt-1">{code}</div>

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
                Séria ešte nevyšla
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
          </div>

          <div className="w-full">
            <SeasonEpisodeQuickActionsBar
              reviewApiBase={`/api/episodes/${episode.id}`}
              reviewTitle={`${movie.title} — ${code} — ${title}`}
              myReviewId={myReview?.id || null}
              myReviewBody={myReview?.body || ''}
              myReviewRating={myRating}
              movieId={movie.id}
              movieTitle={movie.title}
              movieYear={movie.year}
              initialInWatchlist={isInWatchlist}
              initialInFavorites={isInFavorites}
              isLoggedIn={!!viewerId}
            />
          </div>
        </div>

        {episode.synopsis && (
          <p className="text-[15px] text-ink leading-relaxed whitespace-pre-wrap mb-5">{episode.synopsis}</p>
        )}

        <MovieTabsSection
          primaryTabs={[
            {
              key: 'prehlad',
              label: 'Prehľad',
              content: (
                <div className="space-y-8">
                  <div>
                    <div className="flex items-center justify-between bg-surface border border-line rounded-t-xl px-4 py-2.5">
                      <span className="text-sm font-bold text-ink">Recenzie{episode.reviews.length > 0 ? ` (${episode.reviews.length})` : ''}</span>
                      {episode.reviews.length > 0 && <MovieGoToTabButton tabKey="recenzie" />}
                    </div>
                    <div className="border border-t-0 border-line rounded-b-xl divide-y divide-line">
                      {episode.reviews.length === 0 ? (
                        <p className="text-sm text-muted p-4">Zatiaľ žiadna recenzia.</p>
                      ) : (
                        episode.reviews.slice(0, 5).map((review) => (
                          <div key={review.id} className="p-4">{renderReviewCard(review, false)}</div>
                        ))
                      )}
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
                    <h3 className="font-display font-bold text-xl text-ink">Recenzie {episode.reviews.length > 0 && `(${episode.reviews.length})`}</h3>
                    {viewerId && season.released && !myReview && (
                      <Link
                        href={`/movie/${movie.slug}/sezona/${season.number}/epizoda/${episode.number}/napisat`}
                        className="text-xs font-bold text-white bg-accent px-3.5 py-1.5 rounded-full hover:bg-accent-dark whitespace-nowrap"
                      >
                        PRIDAŤ RECENZIU
                      </Link>
                    )}
                  </div>
                  {!season.released ? (
                    <p className="text-muted text-sm">Séria ešte nevyšla — recenzie budú dostupné po jej vydaní.</p>
                  ) : episode.reviews.length === 0 ? (
                    <p className="text-muted text-sm">K tejto epizóde zatiaľ nie je žiadna recenzia.</p>
                  ) : (
                    episode.reviews.map((review, i) => (
                      <div key={review.id} className={i < episode.reviews.length - 1 ? 'mb-12 pb-10 border-b border-line' : ''}>
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
              key: 'videa',
              label: 'Videá',
              content:
                tabVideos.length > 0 ? (
                  <div className="space-y-5 max-w-2xl">
                    {tabVideos.map((v) => (
                      <div key={v.id}>
                        {v.title && <div className="text-sm font-semibold text-ink mb-2">{v.title}</div>}
                        <div className="relative rounded-xl overflow-hidden bg-night aspect-video">
                          <iframe
                            src={`https://www.youtube.com/embed/${v.youtubeId}`}
                            title={v.title || 'Video'}
                            className="absolute inset-0 w-full h-full"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted">K tejto epizóde zatiaľ nie je nahraté žiadne video.</p>
                )
            },
            {
              key: 'galeria',
              desktopOnly: true,
              label: 'Galéria',
              content:
                episode.photos.length > 0 ? (
                  <MovieGallery movieId={movie.id} photos={episode.photos} noHeading />
                ) : (
                  <p className="text-sm text-muted">K tejto epizóde zatiaľ nie je nahratá žiadna fotka.</p>
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
              ) : episode.onlineUrl || movie.watchUrl ? (
                <a
                  href={episode.onlineUrl || movie.watchUrl!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="relative block max-w-2xl aspect-video rounded-xl overflow-hidden bg-night group"
                >
                  <div
                    className="absolute inset-0 bg-cover bg-center group-hover:scale-[1.03] transition-transform duration-300"
                    style={episode.onlineImage ? { backgroundImage: `url('${episode.onlineImage}')` } : undefined}
                  />
                  <div className="absolute inset-0 bg-black/25 group-hover:bg-black/35 transition-colors flex items-center justify-center">
                    <span className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <IconPlay className="w-6 h-6 ml-1 text-night" />
                    </span>
                  </div>
                  <span className="absolute bottom-2 left-2 bg-night/70 text-white text-xs font-semibold px-2 py-1 rounded-full">{code}</span>
                </a>
              ) : (
                <p className="text-sm text-muted">K tomuto seriálu zatiaľ nie je nastavená možnosť sledovania online.</p>
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

        <div className="sm:hidden mt-5">
          <TagsBox tags={movieTags} />
        </div>
      </div>

      <div>
        <div className="hidden sm:block border border-line rounded-xl overflow-hidden">
          <div className="text-center py-6 px-4" style={scoreColorStyle(percent)}>
            <div className="font-display font-extrabold text-4xl leading-none">{percent === null ? '—' : `${percent}%`}</div>
            <div className="text-xs opacity-90 mt-1">{episode.ratings.length} hlasov</div>
          </div>
          <div className="p-4 bg-card">
            <div className="text-xs font-bold uppercase tracking-wide text-muted mb-2">Moje hodnotenie</div>
            {!season.released ? (
              <p className="text-sm text-muted">Séria ešte nemala premiéru — hodnotiť a písať recenzie sa dá až po jej vydaní.</p>
            ) : viewerId ? (
              <EntityRatingWidget apiBase={`/api/episodes/${episode.id}`} initialValue={myRating} />
            ) : (
              <p className="text-sm text-muted">
                <Link href="/login" className="text-accent font-semibold hover:underline">Prihlás sa</Link> a ohodnoť epizódu.
              </p>
            )}
          </div>
        </div>

        <div className="hidden sm:block mt-4">
          <TagsBox tags={movieTags} />
        </div>

        {viewerId && (
          <div className="mt-4">
            <EpisodeNoteBox episodeId={episode.id} initialBody={myEpisodeNote?.body || ''} />
          </div>
        )}
      </div>
    </div>
  );
}
