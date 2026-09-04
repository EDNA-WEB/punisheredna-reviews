import { prisma } from '@/lib/prisma';
import { movieJsonLd } from '@/lib/jsonLd';
import { publishedNewsFilter } from '@/lib/publishedFilter';
import type { Metadata } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { mdToHtml, youtubeEmbedUrl, youtubeVideoId } from '@/lib/markdown';
import { displayUserName } from '@/lib/deletedUser';
import { logActivity } from '@/lib/logActivity';
import MovieNoteBox from '@/components/MovieNoteBox';
import SimilarMoviesBox from '@/components/SimilarMoviesBox';
import AdminQuickEditButton from '@/components/AdminQuickEditButton';
import WatchlistButton from '@/components/WatchlistButton';
import BoxOfficeStatus from '@/components/BoxOfficeStatus';
import { tmdbGetLiveBoxOffice } from '@/lib/tmdb';
import MovieGallery from '@/components/MovieGallery';
import MovieTabsSection from '@/components/MovieTabsSection';
import MovieGoToTabButton from '@/components/MovieGoToTabButton';
import ReviewSortSelect from '@/components/ReviewSortSelect';
import MovieVideoTabs from '@/components/MovieVideoTabs';
import OnlineEpisodeBrowser from '@/components/OnlineEpisodeBrowser';
import YouTubeSubtitlePlayer from '@/components/YouTubeSubtitlePlayer';
import FlagCZ from '@/components/FlagCZ';
import WhereToWatchBox from '@/components/WhereToWatchBox';
import RelatedNewsBox from '@/components/RelatedNewsBox';
import TagsBox from '@/components/TagsBox';
import MovieLinksBox from '@/components/MovieLinksBox';
import MoviePremieresBox from '@/components/MoviePremieresBox';
import MovieQuickActionsBar from '@/components/MovieQuickActionsBar';
import MovieDiscussionSection from '@/components/MovieDiscussionSection';
import ExpandableSynopsis from '@/components/ExpandableSynopsis';
import ExpandableReviewBody from '@/components/ExpandableReviewBody';
import MovieRatersLists from '@/components/MovieRatersLists';
import RatingDistributionChart from '@/components/RatingDistributionChart';
import { getDictionary, getUserLanguage } from '@/lib/i18n';
import { computePercent, scoreColorStyle } from '@/lib/rating';
import { getCastDetails } from '@/lib/castDetails';
import PersonNameList from '@/components/PersonNameList';
import StarRating from '@/components/StarRating';
import MovieRatingWidget from '@/components/MovieRatingWidget';
import CriticBadge from '@/components/CriticBadge';
import CollapsibleReviewComments from '@/components/CollapsibleReviewComments';
import ReviewActions from '@/components/ReviewActions';
import ReactionButtons from '@/components/ReactionButtons';
import { IconUser, IconClock, IconPlay } from '@/components/Icons';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const movie = await prisma.movie.findUnique({
    where: { slug: params.slug },
    select: { title: true, synopsis: true, poster: true, year: true, genres: true, contentType: true }
  });
  if (!movie) return {};

  const description = movie.synopsis
    ? movie.synopsis.slice(0, 160)
    : `${movie.contentType === 'Seriál' ? 'Seriál' : 'Film'}${movie.year ? ` z roku ${movie.year}` : ''}${movie.genres ? ` — ${movie.genres}` : ''}. Recenzie, hodnotenia a diskusia na PunisherEDNA reviews.`;

  return {
    title: movie.title,
    description,
    openGraph: {
      title: movie.title,
      description,
      images: movie.poster ? [{ url: movie.poster }] : undefined,
      type: 'video.movie'
    },
    twitter: {
      card: 'summary_large_image',
      title: movie.title,
      description,
      images: movie.poster ? [movie.poster] : undefined
    }
  };
}

export default async function MoviePage({ params, searchParams }: { params: { slug: string }; searchParams: { sort?: string } }) {
  const session = await getServerSession(authOptions);
  const viewerId = (session?.user as any)?.id;
  const viewer = viewerId ? await prisma.user.findUnique({ where: { id: viewerId }, select: { membershipUntil: true } }) : null;
  const settings = await prisma.settings.findUnique({ where: { id: 'singleton' }, select: { onlineFreeForAll: true } });
  const isMember = settings?.onlineFreeForAll || !!(viewer?.membershipUntil && viewer.membershipUntil > new Date());
  const dict = await getDictionary(await getUserLanguage());
  const t = (key: string) => dict[key] || key;
  const isAdmin = (session?.user as any)?.role === 'ADMIN';
  const sortMode = ['likes', 'newest', 'oldest', 'rating', 'karma'].includes(searchParams?.sort || '') ? searchParams!.sort! : 'rating';

  const movie = await prisma.movie.findUnique({
    where: { slug: params.slug },
    include: {
      ratings: { where: { seasonId: null, episodeId: null } },
      streamingServices: {
        include: { streamingService: true },
        orderBy: { streamingService: { order: 'asc' } }
      },
      links: {
        include: { linkType: true },
        orderBy: { linkType: { order: 'asc' } }
      },
      premiereDates: {
        orderBy: { releaseDate: 'asc' }
      },
      photos: {
        where: { episodeId: null },
        orderBy: { order: 'asc' },
        select: { id: true, thumbnail: true }
      },
      reviews: {
        where: { seasonId: null, episodeId: null },
        include: {
          author: { select: { id: true, name: true, avatar: true, role: true, membershipUntil: true } },
          likes: true,
          comments: {
            where: { parentId: null },
            orderBy: { createdAt: 'asc' },
            include: {
              user: { select: { name: true, role: true, avatar: true } },
              likes: true,
              replies: {
                orderBy: { createdAt: 'asc' },
                include: { user: { select: { name: true, role: true, avatar: true } }, likes: true }
              }
            }
          }
        }
      }
    }
  });

  if (!movie) return notFound();
  if (!movie.approved && movie.submittedById !== viewerId && !isAdmin) return notFound();

  if (viewerId) {
    logActivity(viewerId, `Profil filmu ${movie.title}`, `/movie/${movie.slug}`);
  }

  const percent = computePercent(movie.ratings);
  const isUpcoming = !!(movie.releaseDate && movie.releaseDate > new Date());
  const oneMonthAgoForCinemas = new Date();
  oneMonthAgoForCinemas.setMonth(oneMonthAgoForCinemas.getMonth() - 1);
  const isInCinemas = !!(movie.nowShowing && (!movie.releaseDate || movie.releaseDate >= oneMonthAgoForCinemas));
  // Ak je film prepojený s TMDb, rozpočet a tržby naťahujeme VŽDY naživo — sú to
  // hodnoty, čo sa v čase menia (film ešte v kinách zarába), takže sa nikdy neukladajú
  // do našej databázy, len sa zobrazí aktuálny stav priamo z TMDb.
  const liveBoxOffice = movie.tmdbId ? await tmdbGetLiveBoxOffice(movie.tmdbId) : null;
  const effectiveBudget = liveBoxOffice?.budget ?? movie.budget;
  const effectiveBoxOffice = liveBoxOffice?.boxOffice ?? movie.boxOffice;
  const myRating = viewerId ? movie.ratings.find((r) => r.userId === viewerId) : null;
  const myNote = viewerId ? await prisma.movieNote.findUnique({ where: { movieId_userId: { movieId: movie.id, userId: viewerId } } }) : null;
  const isInWatchlist = viewerId
    ? !!(await prisma.watchlistItem.findUnique({ where: { userId_movieId: { userId: viewerId, movieId: movie.id } } }))
    : false;
  const myReview = viewerId ? movie.reviews.find((r) => r.authorId === viewerId) : null;
  const isInFavorites = viewerId
    ? !!(await prisma.movieListItem.findFirst({
        where: { movieId: movie.id, list: { authorId: viewerId, title: 'Obľúbené' } }
      }))
    : false;

  const [ratersUsers, wantToWatchUsers] = await Promise.all([
    prisma.rating.findMany({
      where: { movieId: movie.id, seasonId: null, episodeId: null },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: { value: true, user: { select: { id: true, name: true, banned: true } } }
    }),
    prisma.watchlistItem.findMany({
      where: { movieId: movie.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: { user: { select: { id: true, name: true, banned: true } } }
    })
  ]);
  const raters = ratersUsers.filter((r) => !r.user.banned).map((r) => ({ id: r.user.id, name: r.user.name, value: r.value }));
  const wantToWatch = wantToWatchUsers.filter((w) => !w.user.banned).map((w) => ({ id: w.user.id, name: w.user.name }));

  const searchTerms = Array.from(
    new Set(
      [movie.title, movie.originalTitle, ...(movie.tags ? movie.tags.split(',') : [])]
        .map((t) => (t || '').trim())
        .filter((t) => t.length > 1)
    )
  );

  const relatedNews = searchTerms.length
    ? await prisma.newsPost.findMany({
        where: { AND: [{ OR: searchTerms.map((term) => ({ title: { contains: term, mode: 'insensitive' } })) }, publishedNewsFilter()] },
        orderBy: { createdAt: 'desc' },
        take: 4,
        select: { id: true, title: true, slug: true, summary: true, coverImage: true, createdAt: true }
      })
    : [];

  const movieTags = movie.tags
    ? movie.tags.split(',').map((tg) => tg.trim()).filter(Boolean)
    : [];

  const trivia = await prisma.movieTrivia.findMany({
    where: { movieId: movie.id },
    orderBy: { order: 'asc' },
    select: { id: true, text: true }
  });

  const seasons = movie.contentType === 'Seriál'
    ? await prisma.season.findMany({
        where: { movieId: movie.id },
        orderBy: { number: 'asc' },
        include: {
          ratings: { where: { episodeId: null } },
          episodes: { orderBy: { number: 'asc' }, include: { ratings: true } }
        }
      })
    : [];

  const watchedEpisodeIds = viewerId
    ? new Set(
        (
          await prisma.watchedEpisode.findMany({
            where: { userId: viewerId, episode: { season: { movieId: movie.id } } },
            select: { episodeId: true }
          })
        ).map((w) => w.episodeId)
      )
    : new Set<string>();

  const movieVideos = await prisma.movieVideo.findMany({
    where: { movieId: movie.id, episodeId: null, seasonId: null },
    orderBy: { order: 'asc' },
    select: {
      id: true,
      url: true,
      category: true,
      title: true,
      subtitles: { orderBy: { startTime: 'asc' }, select: { startTime: true, endTime: true, text: true } }
    }
  });
  const videoGroups = [
    { key: 'trailer', label: t('movie.trailery') },
    { key: 'tv_spot', label: t('movie.tv_spoty') },
    { key: 'ukazka', label: t('movie.ukazky_z_filmu') }
  ].map((g) => ({
    ...g,
    videos: movieVideos
      .filter((v) => v.category === g.key)
      .map((v) => ({ id: v.id, title: v.title, youtubeId: youtubeVideoId(v.url), subtitles: v.subtitles }))
      .filter((v) => v.youtubeId) as { id: string; title: string | null; youtubeId: string; subtitles: { startTime: number; endTime: number; text: string }[] }[]
  }));
  const totalVideosCount = videoGroups.reduce((n, g) => n + g.videos.length, 0);
  const primaryVideo = videoGroups.find((g) => g.key === 'trailer')?.videos[0] || videoGroups.flatMap((g) => g.videos)[0] || null;

  const authorRatingByUserId = new Map(movie.ratings.map((r) => [r.userId, r.value]));

  const reviewAuthorIds = Array.from(new Set(movie.reviews.map((r) => r.authorId)));
  const [reviewLikes, commentLikes, postLikes, newsLikes] = await Promise.all([
    prisma.like.findMany({
      where: { review: { authorId: { in: reviewAuthorIds } } },
      select: { value: true, review: { select: { authorId: true } } }
    }),
    prisma.like.findMany({
      where: { comment: { userId: { in: reviewAuthorIds } } },
      select: { value: true, comment: { select: { userId: true } } }
    }),
    prisma.like.findMany({
      where: { post: { authorId: { in: reviewAuthorIds } } },
      select: { value: true, post: { select: { authorId: true } } }
    }),
    prisma.like.findMany({
      where: { news: { authorId: { in: reviewAuthorIds } } },
      select: { value: true, news: { select: { authorId: true } } }
    })
  ]);
  const authorKarmaByUserId = new Map<string, number>();
  const addKarma = (userId: string | undefined, value: number) => {
    if (!userId) return;
    authorKarmaByUserId.set(userId, (authorKarmaByUserId.get(userId) || 0) + value);
  };
  reviewLikes.forEach((l) => addKarma(l.review?.authorId, l.value));
  commentLikes.forEach((l) => addKarma(l.comment?.userId, l.value));
  postLikes.forEach((l) => addKarma(l.post?.authorId, l.value));
  newsLikes.forEach((l) => addKarma(l.news?.authorId, l.value));

  const sortedReviews = [...movie.reviews].sort((a, b) => {
    if (sortMode === 'karma') {
      return (authorKarmaByUserId.get(b.authorId) || 0) - (authorKarmaByUserId.get(a.authorId) || 0);
    }
    if (sortMode === 'likes') {
      const aLikes = a.likes.filter((l) => l.value === 1).length;
      const bLikes = b.likes.filter((l) => l.value === 1).length;
      return bLikes - aLikes;
    }
    if (sortMode === 'oldest') return a.createdAt.getTime() - b.createdAt.getTime();
    if (sortMode === 'rating') {
      const aRating = authorRatingByUserId.get(a.authorId) || 0;
      const bRating = authorRatingByUserId.get(b.authorId) || 0;
      return bRating - aRating;
    }
    // newest
    return b.createdAt.getTime() - a.createdAt.getTime();
  });

  const genres = (movie.genres || '').split(',').map((g) => g.trim()).filter(Boolean);
  const cast = (movie.cast || '').split(',').map((c) => c.trim()).filter(Boolean);
  const crewNames = [movie.director, movie.screenplay, movie.cinematography, movie.music]
    .filter(Boolean)
    .flatMap((v) => (v as string).split(',').map((x) => x.trim()));
  const allNames = Array.from(new Set([...cast, ...crewNames]));
  const people = allNames.length
    ? await prisma.person.findMany({ where: { name: { in: allNames } }, select: { name: true, slug: true } })
    : [];
  const slugByName = new Map(people.map((p) => [p.name, p.slug]));
  const embed = movie.trailerUrl ? youtubeEmbedUrl(movie.trailerUrl) : null;

  // Pre každého herca: profilová fotka, miesto pôvodu a top 3 najlepšie hodnotené filmy,
  // v ktorých na našom webe hral (dopĺňa sa to automaticky, ako pribúdajú nové filmy).
  const castDetails = await getCastDetails(cast);

  const [discussionComments, isFollowingDiscussion] = await Promise.all([
    prisma.comment.findMany({
      where: { movieId: movie.id, parentId: null },
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { name: true, role: true, avatar: true } },
        likes: true,
        replies: {
          orderBy: { createdAt: 'asc' },
          include: { user: { select: { name: true, role: true, avatar: true } }, likes: true }
        }
      }
    }),
    viewerId
      ? prisma.movieDiscussionFollow
          .findUnique({ where: { userId_movieId: { userId: viewerId, movieId: movie.id } } })
          .then((f) => !!f)
      : false
  ]);
  const discussionCommentsSerialized = discussionComments.map((c) => ({
    ...c,
    createdAt: c.createdAt.toISOString(),
    replies: c.replies.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() }))
  }));

  const top5Reviews = [...movie.reviews]
    .sort((a, b) => b.likes.filter((l) => l.value === 1).length - a.likes.filter((l) => l.value === 1).length)
    .slice(0, 5);

  function renderReviewCard(review: (typeof top5Reviews)[number], withComments: boolean) {
    if (!movie) return null;
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
          {authorRatingByUserId.has(review.authorId) && (
            <StarRating rating={authorRatingByUserId.get(review.authorId)!} size="w-4 h-4" />
          )}
          <span className="text-xs text-muted flex items-center gap-1.5 ml-auto">
            <IconClock className="w-3.5 h-3.5" />
            {new Date(review.createdAt).toLocaleDateString('sk-SK', { day: 'numeric', month: 'long', year: 'numeric' })}
          </span>
        </div>

        <div className="mb-3">
          <ExpandableReviewBody html={mdToHtml(review.body)} plainText={review.body} />
        </div>

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

        {(isAdmin || review.authorId === viewerId) && (
          <ReviewActions id={review.id} movieSlug={movie.slug} showEdit={review.authorId !== viewerId} />
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
    <div className="pt-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: movieJsonLd({
            title: movie.title,
            slug: movie.slug,
            synopsis: movie.synopsis,
            poster: movie.poster,
            year: movie.year,
            contentType: movie.contentType,
            director: movie.director,
            cast: movie.cast,
            percent,
            ratingCount: movie.ratings.length
          })
        }}
      />
      {!movie.approved && (
        <div className="mb-5 bg-amber-50 border border-amber-300 text-amber-800 text-sm font-semibold rounded-xl px-4 py-3">
          {t('movie.caka_na_schvalenie')}
        </div>
      )}
      <div className="grid md:grid-cols-[1fr_260px] gap-8 mb-8">
        <div className="min-w-0">
          {/* Mobilná hlavička — poradie podľa referenčného návrhu: originálny názov, lokálny názov s vlajkou, plagát + trailer, žánre, krajina/rok/dĺžka */}
          <div className="sm:hidden mb-5 border border-line rounded-xl">
            <div className="bg-surface px-4 py-3 rounded-t-xl">
              {movie.originalTitle && movie.originalTitle !== movie.title ? (
                <h1 className="font-display font-extrabold text-2xl text-ink leading-tight mb-1">{movie.originalTitle}</h1>
              ) : (
                <h1 className="font-display font-extrabold text-2xl text-ink leading-tight">{movie.title}</h1>
              )}
              {movie.originalTitle && movie.originalTitle !== movie.title && (
                <div className="flex items-center gap-1.5">
                  <FlagCZ />
                  <span className="text-base font-semibold text-ink">{movie.title}</span>
                </div>
              )}
            </div>

            <div className="p-4">
              <div className={`relative flex gap-3 mb-3 w-full min-w-0 overflow-hidden ${!primaryVideo ? 'justify-center' : ''}`}>
                <div className={`flex-none rounded-xl overflow-hidden shadow-xl border border-line aspect-[2/3] bg-surface ${primaryVideo ? 'w-32' : 'w-44'}`}>
                  {movie.poster && <img src={movie.poster} alt={movie.title} className="w-full h-full object-cover" />}
                </div>
                {primaryVideo && (
                  <div className="relative flex-1 min-w-0 rounded-xl overflow-hidden border border-line bg-black aspect-video">
                    <YouTubeSubtitlePlayer videoId={primaryVideo.youtubeId} subtitles={primaryVideo.subtitles} fill />
                  </div>
                )}
              </div>

              {genres.length > 0 && (
                <div className="text-sm mb-1.5 leading-relaxed">
                  {genres.map((g, i) => (
                    <span key={g}>
                      {i > 0 && <span className="text-muted"> · </span>}
                      <Link href={`/recenzie?genre=${encodeURIComponent(g)}`} className="text-accent font-semibold hover:underline">
                        {g}
                      </Link>
                    </span>
                  ))}
                </div>
              )}

              <div className="flex items-start justify-between gap-3">
                <div className="text-sm text-muted">
                  {[movie.countries, movie.year, movie.runtimeMinutes ? `${movie.runtimeMinutes} ${t('movie.min')}` : null].filter(Boolean).join(' · ')}
                </div>
                {effectiveBudget && (
                  <details className="flex-none text-right">
                    <summary className="cursor-pointer select-none text-xs font-semibold text-accent list-none">{t('boxoffice.nadpis')}</summary>
                    <div className="mt-2 text-right">
                      <BoxOfficeStatus
                        budget={effectiveBudget}
                        marketingBudget={movie.marketingBudget}
                        boxOffice={effectiveBoxOffice}
                        domesticBoxOffice={movie.domesticBoxOffice}
                        internationalBoxOffice={movie.internationalBoxOffice}
                        compact
                        labels={{
                          ciel: t('boxoffice.ciel'),
                          ziskovy: t('boxoffice.ziskovy'),
                          nedosiahnute: t('boxoffice.nedosiahnute'),
                          nad_cielom: t('boxoffice.nad_cielom'),
                          do_ciela: t('boxoffice.do_ciela'),
                          domace: t('boxoffice.domace'),
                          medzinarodne: t('boxoffice.medzinarodne'),
                          celosvetovo: t('boxoffice.celosvetovo'),
                          vsetky_uvedenia: t('boxoffice.vsetky_uvedenia')
                        }}
                      />
                    </div>
                  </details>
                )}
              </div>
            </div>

            <div className="px-4 pb-3">
              <div className="space-y-1 text-sm border border-line rounded-xl p-3 bg-surface">
                {movie.director && (
                  <div><span className="text-muted">{t('movie.rezia')} </span><span className="text-ink font-medium"><PersonNameList names={movie.director.split(',').map((x) => x.trim())} slugByName={slugByName} /></span></div>
                )}
                {movie.screenplay && (
                  <div><span className="text-muted">{t('movie.scenar')} </span><span className="text-ink font-medium"><PersonNameList names={movie.screenplay.split(',').map((x) => x.trim())} slugByName={slugByName} /></span></div>
                )}
                {movie.cinematography && (
                  <div><span className="text-muted">{t('movie.kamera')} </span><span className="text-ink font-medium"><PersonNameList names={movie.cinematography.split(',').map((x) => x.trim())} slugByName={slugByName} /></span></div>
                )}
                {movie.music && (
                  <div><span className="text-muted">{t('movie.hudba')} </span><span className="text-ink font-medium"><PersonNameList names={movie.music.split(',').map((x) => x.trim())} slugByName={slugByName} /></span></div>
                )}
                {cast.length > 0 && (
                  <div><span className="text-muted">{t('movie.hraju_dvojbodka')} </span><span className="text-ink font-medium"><PersonNameList names={cast} slugByName={slugByName} /></span></div>
                )}
              </div>
            </div>

            <div className="px-4 pb-4">
              <MovieQuickActionsBar
                movieId={movie.id}
                movieSlug={movie.slug}
                movieTitle={movie.title}
                movieYear={movie.year}
                myReviewId={myReview?.id || null}
                myReviewBody={myReview?.body || ''}
                myReviewRating={myRating?.value || 0}
                initialInWatchlist={isInWatchlist}
                initialInFavorites={isInFavorites}
                isLoggedIn={!!viewerId}
              />
            </div>
          </div>

          <div className="hidden sm:block relative mb-4 border border-line rounded-xl p-4">
            <div className="flex gap-5 items-start">
            <div className="w-32 sm:w-40 flex-none rounded-xl overflow-hidden shadow-xl border border-line aspect-[2/3] bg-surface">
              {movie.poster && <img src={movie.poster} alt={movie.title} className="w-full h-full object-cover" />}
            </div>
            <div className="min-w-0 pt-1 flex-1">
              <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-ink leading-tight mb-1">{movie.title}</h1>
              {movie.originalTitle && movie.originalTitle !== movie.title && (
                <p className="text-muted text-sm mb-3">{movie.originalTitle}</p>
              )}

              {genres.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {genres.map((g) => (
                    <span key={g} className="text-xs font-semibold text-ink bg-surface border border-line px-2.5 py-1 rounded-full">
                      {g}
                    </span>
                  ))}
                </div>
              )}

              <div className="text-sm text-muted mb-3">
                {[movie.countries, movie.year, movie.runtimeMinutes ? `${movie.runtimeMinutes} ${t('movie.min')}` : null].filter(Boolean).join(' · ')}
              </div>

              {isUpcoming && (
                <div className="inline-block bg-surface border border-line text-ink text-xs font-semibold px-3 py-1.5 rounded-full mb-3">
                  {t('movie.premiera')} {movie.releaseDate!.toLocaleDateString('sk-SK', { day: 'numeric', month: 'long', year: 'numeric' })}
                </div>
              )}
              {!isUpcoming && movie.releaseDate && movie.contentType === 'Seriál' && (
                <div className="text-xs text-muted mb-3">
                  {t('movie.na_vod_od')} {movie.releaseDate.toLocaleDateString('sk-SK', { day: 'numeric', month: 'long', year: 'numeric' })}
                </div>
              )}

              <div className="space-y-1 text-sm border border-line rounded-xl p-3 bg-surface">
                {movie.director && (
                  <div><span className="text-muted">{t('movie.rezia')} </span><span className="text-ink font-medium"><PersonNameList names={movie.director.split(',').map((x) => x.trim())} slugByName={slugByName} /></span></div>
                )}
                {movie.screenplay && (
                  <div><span className="text-muted">{t('movie.scenar')} </span><span className="text-ink font-medium"><PersonNameList names={movie.screenplay.split(',').map((x) => x.trim())} slugByName={slugByName} /></span></div>
                )}
                {movie.cinematography && (
                  <div><span className="text-muted">{t('movie.kamera')} </span><span className="text-ink font-medium"><PersonNameList names={movie.cinematography.split(',').map((x) => x.trim())} slugByName={slugByName} /></span></div>
                )}
                {movie.music && (
                  <div><span className="text-muted">{t('movie.hudba')} </span><span className="text-ink font-medium"><PersonNameList names={movie.music.split(',').map((x) => x.trim())} slugByName={slugByName} /></span></div>
                )}
                {cast.length > 0 && (
                  <div><span className="text-muted">{t('movie.hraju_dvojbodka')} </span><span className="text-ink font-medium"><PersonNameList names={cast} slugByName={slugByName} /></span></div>
                )}
              </div>
            </div>
            </div>

            <MovieQuickActionsBar
              movieId={movie.id}
              movieSlug={movie.slug}
              movieTitle={movie.title}
              movieYear={movie.year}
              myReviewId={myReview?.id || null}
              myReviewBody={myReview?.body || ''}
              myReviewRating={myRating?.value || 0}
              initialInWatchlist={isInWatchlist}
              initialInFavorites={isInFavorites}
              isLoggedIn={!!viewerId}
            />
          </div>

          {/* Mobil — hodnotenie + graf, hneď pod hlavičkou */}
          <div className="sm:hidden mb-5 border border-line rounded-xl overflow-hidden">
            <div className="text-center py-6 px-4" style={scoreColorStyle(percent)}>
              <div className="font-display font-extrabold text-4xl leading-none">{percent === null ? '—' : `${percent}%`}</div>
              <div className="text-xs opacity-90 mt-1">{movie.ratings.length} {t('movie.hlasov')}</div>
            </div>
            {movie.ratings.length > 0 && (
              <div className="px-4 pt-4 pb-2 border-b border-line bg-card">
                <RatingDistributionChart values={movie.ratings.map((r) => r.value)} label={t('movie.rozlozenie_hodnoteni')} />
              </div>
            )}
            <div className="p-4 bg-card">
              <div className="text-xs font-bold uppercase tracking-wide text-muted mb-2">{t('movie.moje_hodnotenie')}</div>
              {isUpcoming ? (
                <p className="text-xs text-muted">
                  {t('movie.este_nemal_premieru')}{' '}
                  {movie.releaseDate!.toLocaleDateString('sk-SK', { day: 'numeric', month: 'long', year: 'numeric' })}.
                </p>
              ) : viewerId ? (
                <MovieRatingWidget movieId={movie.id} initialValue={myRating?.value || 0} />
              ) : (
                <p className="text-xs text-muted">
                  <Link href="/login" className="text-accent font-semibold hover:underline">{t('movie.prihlas_sa')}</Link> {t('movie.a_ohodnot_film')}
                </p>
              )}
            </div>
            <div className="p-4 bg-card border-t border-line">
              <MovieRatersLists raters={raters} t={t} />
            </div>
          </div>


          {movie.contentType === 'Seriál' && seasons.length > 0 && (
            <div className="border border-line rounded-xl overflow-hidden mb-5">
              <div className="bg-surface px-4 py-2.5 border-b border-line">
                <h2 className="font-display font-bold text-sm text-ink">
                  {t('movie.seria')} ({seasons.length}) <span className="text-line mx-1.5">•</span> {t('movie.epizody')} ({seasons.reduce((n, s) => n + s.episodeCount, 0)})
                </h2>
              </div>
              <div className="p-4 bg-card flex flex-wrap gap-2.5">
                {seasons.map((s) => (
                  <Link
                    key={s.id}
                    href={`/movie/${movie.slug}/sezona/${s.number}`}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-lg border text-sm transition-colors ${
                      s.released
                        ? 'border-accent/30 hover:border-accent hover:bg-accent/5'
                        : 'border-line hover:border-ink'
                    }`}
                  >
                    <span className="w-2.5 h-2.5 rounded-[3px] flex-none" style={{ backgroundColor: s.released ? '#E3141F' : '#D9D9D9' }} />
                    <span className={`font-semibold ${s.released ? 'text-accent' : 'text-muted'}`}>{t('movie.season')} {s.number}</span>
                    {s.year && <span className="text-muted">· {s.year}</span>}
                    <span className="text-muted">· {s.episodeCount} {t('movie.epizod')}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {effectiveBudget && (
            <details className="hidden sm:block mt-4 text-xs text-muted group">
              <summary className="cursor-pointer select-none hover:text-ink w-fit">{t('boxoffice.nadpis')}</summary>
              <div className="mt-2 max-w-xs">
                <BoxOfficeStatus
                  budget={effectiveBudget}
                  marketingBudget={movie.marketingBudget}
                  boxOffice={effectiveBoxOffice}
                  domesticBoxOffice={movie.domesticBoxOffice}
                  internationalBoxOffice={movie.internationalBoxOffice}
                  compact
                  labels={{
                    ciel: t('boxoffice.ciel'),
                    ziskovy: t('boxoffice.ziskovy'),
                    nedosiahnute: t('boxoffice.nedosiahnute'),
                    nad_cielom: t('boxoffice.nad_cielom'),
                    do_ciela: t('boxoffice.do_ciela'),
                    domace: t('boxoffice.domace'),
                    medzinarodne: t('boxoffice.medzinarodne'),
                    celosvetovo: t('boxoffice.celosvetovo'),
                    vsetky_uvedenia: t('boxoffice.vsetky_uvedenia')
                  }}
                />
              </div>
            </details>
          )}

          <WhereToWatchBox
            isInCinemas={isInCinemas}
            cinemaHref="/kino"
            services={movie.streamingServices.map((s) => ({
              id: s.streamingServiceId,
              name: s.streamingService.name,
              icon: s.streamingService.icon,
              color: s.streamingService.color,
              url: s.url
            }))}
          />

          {movie.synopsis && (
            <div className="mb-8 mt-6">
              <h3 className="font-display font-bold text-lg text-ink mb-2">{t('movie.obsah')}</h3>
              <ExpandableSynopsis text={movie.synopsis} />
            </div>
          )}


          <MovieTabsSection
        primaryTabs={[
          {
            key: 'prehlad',
            label: t('movie.prehlad'),
            content: (
              <div className="space-y-8">
                <div>
                  <div className="flex items-center justify-between bg-surface border border-line rounded-t-xl px-4 py-2.5">
                    <span className="text-sm font-bold text-ink">{t('movie.videa')}{totalVideosCount > 0 ? ` (${totalVideosCount})` : embed ? ' (1)' : ''}</span>
                    {(primaryVideo || embed) && (
                      <MovieGoToTabButton tabKey="videa" />
                    )}
                  </div>
                  <div className="border border-t-0 border-line rounded-b-xl overflow-hidden">
                    {primaryVideo ? (
                      <YouTubeSubtitlePlayer videoId={primaryVideo.youtubeId} subtitles={primaryVideo.subtitles} />
                    ) : embed ? (
                      <div className="relative aspect-video bg-night">
                        <iframe
                          src={embed}
                          title={`Trailer — ${movie.title}`}
                          className="absolute inset-0 w-full h-full"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      </div>
                    ) : (
                      <p className="text-sm text-muted p-4">{t('movie.ziadny_trailer')}</p>
                    )}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between bg-surface border border-line rounded-t-xl px-4 py-2.5">
                    <span className="text-sm font-bold text-ink">{t('movie.recenzie')}{movie.reviews.length > 0 ? ` (${movie.reviews.length})` : ''}</span>
                    {movie.reviews.length > 5 && (
                      <MovieGoToTabButton tabKey="recenzie" />
                    )}
                  </div>
                  <div className="border border-t-0 border-line rounded-b-xl p-4">
                    {top5Reviews.length === 0 ? (
                      <p className="text-sm text-muted">{t('movie.ziadna_recenzia')}</p>
                    ) : (
                      top5Reviews.map((review, i) => (
                        <div key={review.id} className={i < top5Reviews.length - 1 ? 'mb-8 pb-8 border-b border-line' : ''}>
                          {renderReviewCard(review, false)}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between bg-surface border border-line rounded-t-xl px-4 py-2.5">
                    <span className="text-sm font-bold text-ink">{t('movie.galeria')}{movie.photos.length > 0 ? ` (${movie.photos.length})` : ''}</span>
                    {movie.photos.length > 0 && (
                      <MovieGoToTabButton tabKey="galeria" />
                    )}
                  </div>
                  <div className="border border-t-0 border-line rounded-b-xl overflow-hidden bg-surface">
                    {movie.photos.length > 0 ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={movie.photos[0].thumbnail} alt="" className="w-full max-h-80 object-cover" />
                    ) : (
                      <p className="text-sm text-muted p-4">{t('movie.ziadna_fotka')}</p>
                    )}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between bg-surface border border-line rounded-t-xl px-4 py-2.5">
                    <span className="text-sm font-bold text-ink">{t('movie.zaujimavosti')}{trivia.length > 0 ? ` (${trivia.length})` : ''}</span>
                    {trivia.length > 0 && <MovieGoToTabButton tabKey="zaujimavosti" />}
                  </div>
                  <div className="border border-t-0 border-line rounded-b-xl p-4">
                    {trivia.length === 0 ? (
                      <p className="text-sm text-muted">{t('movie.ziadne_zaujimavosti')}</p>
                    ) : (
                      <ul className="space-y-3">
                        {trivia.slice(0, 3).map((tr) => (
                          <li key={tr.id} className="text-sm text-ink leading-relaxed bg-card border border-line rounded-lg p-3">
                            <span className="text-accent mr-1">"</span>{tr.text}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            )
          },
          {
            key: 'recenzie',
            label: t('movie.recenzie'),
            content: (
              <div>
                <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
                  <h3 className="font-display font-bold text-xl text-ink">
                    {t('movie.recenzie')} {movie.reviews.length > 0 && `(${movie.reviews.length})`}
                  </h3>
                  <div className="flex items-center gap-2 flex-wrap">
                    {viewerId && !isUpcoming && !movie.reviews.some((r) => r.authorId === viewerId) && (
                      <Link
                        href={`/movie/${movie.slug}/napisat`}
                        className="text-xs font-bold text-white bg-accent px-3.5 py-1.5 rounded-full hover:bg-accent-dark whitespace-nowrap"
                      >
                        {t('movie.pridat_recenziu')}
                      </Link>
                    )}
                    {movie.reviews.length > 1 && <ReviewSortSelect movieSlug={movie.slug} sortMode={sortMode} />}
                  </div>
                </div>

                {sortedReviews.length === 0 ? (
                  <p className="text-muted text-sm">{t('movie.ziadna_recenzia')}</p>
                ) : (
                  sortedReviews.map((review, i) => (
                    <div key={review.id} className={i < sortedReviews.length - 1 ? 'mb-12 pb-10 border-b border-line' : ''}>
                      {renderReviewCard(review, true)}
                    </div>
                  ))
                )}
              </div>
            )
          },
          {
            key: 'zaujimavosti',
            label: t('movie.zaujimavosti'),
            content: (
              <div>
                <h3 className="font-display font-bold text-xl text-ink mb-5">
                  {t('movie.zaujimavosti')} {trivia.length > 0 && `(${trivia.length})`}
                </h3>

                {trivia.length === 0 ? (
                  <p className="text-sm text-muted">{t('movie.ziadne_zaujimavosti')}</p>
                ) : (
                  <ul className="space-y-3">
                    {trivia.map((tr, i) => (
                      <li key={tr.id} className="text-sm text-ink leading-relaxed bg-surface border border-line rounded-xl p-4 flex gap-3">
                        <span className="font-display font-bold text-accent flex-none">{i + 1}.</span>
                        <span>{tr.text}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )
          },
          ...(movie.contentType === 'Seriál' && seasons.length > 0
            ? [
                {
                  key: 'epizody',
                  label: t('movie.epizody'),
                  content: (
                    <div>
                      <h3 className="font-display font-bold text-xl text-ink mb-5">
                        {t('movie.epizody')} ({seasons.reduce((n, s) => n + s.episodes.length, 0)})
                      </h3>
                      <div className="border border-line rounded-xl overflow-hidden divide-y divide-line">
                        {seasons.map((s) => (
                          <div key={s.id}>
                            <Link
                              href={`/movie/${movie.slug}/sezona/${s.number}`}
                              className={`flex items-center gap-2 px-4 py-2.5 hover:opacity-80 transition-opacity min-w-0 ${s.released ? 'bg-accent/5' : 'bg-surface'}`}
                            >
                              <span className="w-2.5 h-2.5 rounded-[3px] flex-none" style={{ backgroundColor: s.released ? '#E3141F' : '#D9D9D9' }} />
                              <span className={`text-sm font-bold flex-none ${s.released ? 'text-accent' : 'text-muted'}`}>{t('movie.season')} {s.number}</span>
                              {s.year && <span className="text-xs text-muted flex-none">· {s.year}</span>}
                              {!s.released && (
                                <span className="text-xs text-muted ml-auto truncate min-w-0">
                                  {s.releaseDate
                                    ? `${t('movie.vyjde')} ${s.releaseDate.toLocaleDateString('sk-SK', { day: 'numeric', month: 'long', year: 'numeric' })}`
                                    : t('movie.este_nevysla')}
                                </span>
                              )}
                            </Link>
                            <div className="divide-y divide-line">
                              {s.episodes.map((e) => {
                                const code = `S${String(s.number).padStart(2, '0')}E${String(e.number).padStart(2, '0')}`;
                                const epPercent = computePercent(e.ratings);
                                const dotColor = !s.released ? '#D9D9D9' : epPercent !== null ? scoreColorStyle(epPercent).backgroundColor : '#E8E7E5';
                                return (
                                  <Link
                                    key={e.id}
                                    href={`/movie/${movie.slug}/sezona/${s.number}/epizoda/${e.number}`}
                                    className="flex items-center gap-2.5 px-4 py-2.5 bg-card hover:bg-surface transition-colors min-w-0"
                                  >
                                    <span className="w-2 h-2 rounded-[2px] flex-none" style={{ backgroundColor: dotColor }} />
                                    <span className={`text-sm truncate min-w-0 ${s.released ? 'text-ink font-semibold' : 'text-muted'}`}>
                                      {e.title || `${t('movie.epizoda')} ${e.number}`}
                                    </span>
                                    <span className="text-xs text-muted flex-none">({code})</span>
                                    {s.released && epPercent !== null && <span className="text-xs text-muted ml-auto flex-none">{epPercent}%</span>}
                                  </Link>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                }
              ]
            : []),
          {
            key: 'videa',
            label: t('movie.videa'),
            desktopOnly: true,
            content: (
              <div>
                <h3 className="font-display font-bold text-xl text-ink mb-5">
                  {t('movie.videa')} {totalVideosCount > 0 && `(${totalVideosCount})`}
                </h3>

                {totalVideosCount > 0 ? (
                  <MovieVideoTabs groups={videoGroups} />
                ) : embed ? (
                  <div className="relative rounded-xl overflow-hidden bg-surface aspect-video max-w-2xl">
                    <iframe
                      src={embed}
                      title={`Trailer — ${movie.title}`}
                      className="absolute inset-0 w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                ) : (
                  <p className="text-sm text-muted">{t('movie.ziadne_video')}</p>
                )}
              </div>
            )
          },
          {
            key: 'galeria',
            desktopOnly: true,
            label: t('movie.galeria'),
            content:
              movie.photos.length > 0 ? (
                <MovieGallery movieId={movie.id} photos={movie.photos} noHeading />
              ) : (
                <p className="text-sm text-muted">{t('movie.ziadna_fotka')}</p>
              )
          },
          {
            key: 'online',
            desktopOnly: true,
            label: t('movie.online'),
            content: !viewerId && !settings?.onlineFreeForAll ? (
              <p className="text-sm text-muted">
                {t('movie.online_prihlasenie')}{' '}
                <Link href="/login" className="text-accent font-semibold hover:underline">{t('movie.prihlas_sa')}</Link>.
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
            ) : movie.contentType === 'Seriál' && seasons.length > 0 && (movie.watchUrl || seasons.some((s) => s.episodes.some((e) => e.onlineUrl))) ? (
              <OnlineEpisodeBrowser
                seasons={seasons.map((s) => ({
                  number: s.number,
                  year: s.year,
                  released: s.released,
                  episodes: s.episodes.map((e) => ({
                    number: e.number,
                    title: e.title,
                    onlineImage: e.onlineImage,
                    onlineUrl: e.onlineUrl,
                    watched: watchedEpisodeIds.has(e.id)
                  }))
                }))}
                watchUrl={movie.watchUrl || ''}
              />
            ) : movie.watchUrl ? (
              <a
                href={movie.watchUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="relative block max-w-2xl aspect-video rounded-xl overflow-hidden bg-night group"
              >
                <div
                  className="absolute inset-0 bg-cover bg-center group-hover:scale-[1.03] transition-transform duration-300"
                  style={movie.onlineImage ? { backgroundImage: `url('${movie.onlineImage}')` } : undefined}
                />
                <div className="absolute inset-0 bg-black/25 group-hover:bg-black/35 transition-colors flex items-center justify-center">
                  <span className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <IconPlay className="w-6 h-6 ml-1 text-night" />
                  </span>
                </div>
              </a>
            ) : (
              <p className="text-sm text-muted">{t('movie.ziadny_online')}</p>
            )
          },
        ]}
        moreTabs={[
          {
            key: 'hraju',
            label: t('movie.hraju'),
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
                            <div className="text-xs text-muted mb-1">{t('movie.najlepsie_filmy')}</div>
                            <div className="space-y-0.5">
                              {actor.topMovies.map((m) => (
                                <div key={m.slug} className="flex items-center gap-1.5 text-sm">
                                  <span className="w-2 h-2 rounded-sm bg-accent flex-none" />
                                  <Link href={`/movie/${m.slug}`} className="text-accent hover:underline">{m.title}</Link>
                                  <span className="text-muted">· {m.year}</span>
                                  {m.contentType && m.contentType !== 'Film' && (
                                    <span className="text-muted">· {m.contentType}</span>
                                  )}
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
                <p className="text-sm text-muted">{t('movie.ziadne_obsadenie')}</p>
              )
          },
          {
            key: 'diskusia',
            label: t('movie.diskusia'),
            content: (
              <div>
                <MovieDiscussionSection
                  movieId={movie.id}
                  comments={discussionCommentsSerialized}
                  viewerId={viewerId}
                  isAdmin={isAdmin}
                  isFollowing={isFollowingDiscussion}
                />
              </div>
            )
          }
        ]}
      />

      <RelatedNewsBox items={relatedNews} />

      <div className="sm:hidden mt-5">
        <TagsBox tags={movieTags} />
      </div>

      <div className="sm:hidden mt-5">
        <MovieLinksBox
          links={movie.links.map((l) => ({
            id: l.linkTypeId,
            name: l.linkType.name,
            icon: l.linkType.icon,
            color: l.linkType.color,
            url: l.url
          }))}
        />
      </div>

      <div className="sm:hidden mt-5">
        <MoviePremieresBox ageRating={movie.ageRating} premieres={movie.premiereDates} />
      </div>

        </div>

        <div>
          <div className="border border-line rounded-xl overflow-hidden">
            <div className="hidden sm:block text-center py-6 px-4" style={scoreColorStyle(percent)}>
              <div className="font-display font-extrabold text-4xl leading-none">{percent === null ? '—' : `${percent}%`}</div>
              <div className="text-xs opacity-90 mt-1">{movie.ratings.length} {t('movie.hlasov')}</div>
            </div>

            {movie.ratings.length > 0 && (
              <div className="hidden sm:block px-4 pt-4 pb-2 border-b border-line bg-card">
                <RatingDistributionChart values={movie.ratings.map((r) => r.value)} label={t('movie.rozlozenie_hodnoteni')} />
              </div>
            )}

            <div className="hidden sm:block p-4 bg-card border-b border-line">
              <div className="text-xs font-bold uppercase tracking-wide text-muted mb-2">{t('movie.moje_hodnotenie')}</div>
              {isUpcoming ? (
                <p className="text-xs text-muted">
                  {t('movie.este_nemal_premieru')}{' '}
                  {movie.releaseDate!.toLocaleDateString('sk-SK', { day: 'numeric', month: 'long', year: 'numeric' })}.
                </p>
              ) : viewerId ? (
                <MovieRatingWidget movieId={movie.id} initialValue={myRating?.value || 0} />
              ) : (
                <p className="text-xs text-muted">
                  <Link href="/login" className="text-accent font-semibold hover:underline">{t('movie.prihlas_sa')}</Link> {t('movie.a_ohodnot_film')}
                </p>
              )}
            </div>

            <div className="hidden sm:block p-4 bg-card">
              <MovieRatersLists raters={raters} t={t} />
            </div>
          </div>

          <div className="hidden sm:block mt-4">
            <TagsBox tags={movieTags} />
          </div>

          <div className="hidden sm:block mt-4">
            <MovieLinksBox
              links={movie.links.map((l) => ({
                id: l.linkTypeId,
                name: l.linkType.name,
                icon: l.linkType.icon,
                color: l.linkType.color,
                url: l.url
              }))}
            />
          </div>

          <div className="hidden sm:block mt-4">
            <MoviePremieresBox ageRating={movie.ageRating} premieres={movie.premiereDates} />
          </div>

          {viewerId && (
            <div className="mt-4">
              <MovieNoteBox movieId={movie.id} initialBody={myNote?.body || ''} />
            </div>
          )}

          {movie.tmdbId && (
            <div className="mt-4">
              <SimilarMoviesBox
                tmdbId={movie.tmdbId}
                mediaType={movie.contentType === 'Seriál' ? 'tv' : 'movie'}
              />
            </div>
          )}
        </div>
      </div>

      {isAdmin && <AdminQuickEditButton movieId={movie.id} />}
    </div>
  );
}
