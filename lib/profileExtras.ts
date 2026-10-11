import { prisma } from './prisma';
import { canSeeFavorites, FAVORITES_LIST_TITLE } from './favoritesVisibility';
import { getOnlineStatus } from './onlineStatus';
import { loadActivity, loadTaste } from './profileData';
import { sharpImage } from './imageQuality';

// Doplnky pre nový profil v appke (/api/mobile/profile a /api/mobile/user-profile):
// rovnaké údaje ako nový webový profil — top 3, filmový vkus, aktivita,
// fanklub, „sledujú ho aj ľudia, ktorých sleduješ“, štatistiky recenzií.

const sharp = (url: string | null | undefined, w: number) => (url ? sharpImage(url, w) || url : null);

export async function loadProfileExtras(opts: {
  userId: string;
  viewerId: string;
  viewerIsAdmin: boolean;
  reviewIds: string[];
}) {
  const { userId, viewerId, viewerIsAdmin } = opts;
  const isOwn = userId === viewerId;

  const owner = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, deleted: true, favoritesVisibility: true, membershipUntil: true, createdAt: true, banned: true, _count: { select: { followedBy: true } } }
  });
  if (!owner || owner.deleted) return null;

  const [lastActivity, showFavorites, taste, activity, fansRaw, ratingsCount, reviewsCount, latestRated, reviewRows] = await Promise.all([
    prisma.userActivity.findUnique({ where: { userId }, select: { createdAt: true } }),
    canSeeFavorites(owner, viewerId, viewerIsAdmin),
    loadTaste(userId),
    loadActivity(userId),
    prisma.follow.findMany({
      where: { followingId: userId, follower: { deleted: false } },
      orderBy: { createdAt: 'desc' },
      take: 200,
      select: { follower: { select: { id: true, name: true, avatar: true } } }
    }),
    // všetky hodnotenia a recenzie (aj sezón a epizód) — rovnako ako zoznamy v appke
    prisma.rating.count({ where: { userId } }),
    prisma.review.count({ where: { authorId: userId } }),
    prisma.rating.findFirst({ where: { userId, seasonId: null, episodeId: null }, orderBy: { createdAt: 'desc' }, select: { movie: { select: { poster: true } } } }),
    opts.reviewIds.length
      ? prisma.review.findMany({
          where: { id: { in: opts.reviewIds.slice(0, 20) } },
          select: { id: true, movieId: true, seasonId: true, episodeId: true, _count: { select: { comments: true, likes: { where: { value: 1 } } } } }
        })
      : Promise.resolve([] as { id: string; movieId: string; seasonId: string | null; episodeId: string | null; _count: { comments: number; likes: number } }[])
  ]);

  // Top 3 = prvé tri filmy zo zoznamu „Obľúbené“, len ak ich smie vidieť
  let top3: { slug: string; title: string; poster: string | null }[] = [];
  if (showFavorites) {
    const fav = await prisma.movieList.findFirst({
      where: { authorId: userId, title: FAVORITES_LIST_TITLE },
      select: { items: { orderBy: { order: 'asc' }, take: 3, select: { movie: { select: { slug: true, title: true, poster: true } } } } }
    });
    top3 = (fav?.items || []).map((i) => ({ slug: i.movie.slug, title: i.movie.title, poster: sharp(i.movie.poster, 140) }));
  }

  // Hodnotenie autora pri jeho recenziách (len recenzie celého filmu)
  const topLevelMovieIds = reviewRows.filter((r) => !r.seasonId && !r.episodeId).map((r) => r.movieId);
  const ownRatings = topLevelMovieIds.length
    ? await prisma.rating.findMany({ where: { userId, movieId: { in: topLevelMovieIds }, seasonId: null, episodeId: null }, select: { movieId: true, value: true } })
    : [];
  const ratingByMovie = new Map(ownRatings.map((r) => [r.movieId, r.value]));
  const reviewStats: Record<string, { likeCount: number; commentCount: number; rating: number | null }> = {};
  for (const r of reviewRows) {
    reviewStats[r.id] = {
      likeCount: r._count.likes,
      commentCount: r._count.comments,
      rating: !r.seasonId && !r.episodeId ? ratingByMovie.get(r.movieId) ?? null : null
    };
  }

  const isDeleted = (n: string) => n.startsWith('Zmazaný používateľ ');
  const fans = fansRaw.map((f) => f.follower).filter((f) => !isDeleted(f.name));

  // „Sledujú ho aj ľudia, ktorých sleduješ“
  let mutual: { names: string[]; total: number } | null = null;
  if (!isOwn && fans.length) {
    const mine = await prisma.follow.findMany({ where: { followerId: viewerId, followingId: { in: fans.map((f) => f.id) } }, select: { followingId: true } });
    const ids = new Set(mine.map((m) => m.followingId));
    const names = fans.filter((f) => ids.has(f.id)).map((f) => f.name);
    if (names.length) mutual = { names: names.slice(0, 3), total: names.length };
  }

  const membershipActive = !!(owner.membershipUntil && owner.membershipUntil > new Date());

  return {
    online: getOnlineStatus(lastActivity?.createdAt || null),
    memberSince: owner.createdAt,
    golden: membershipActive,
    goldenDaysLeft: isOwn && membershipActive && owner.membershipUntil ? Math.max(1, Math.ceil((owner.membershipUntil.getTime() - Date.now()) / 86_400_000)) : null,
    banned: owner.banned,
    canSeeFavorites: showFavorites,
    backdrop: top3[0]?.poster || sharp(latestRated?.movie.poster, 300),
    top3,
    counts: { ratings: ratingsCount, reviews: reviewsCount, fans: owner._count.followedBy },
    taste,
    activity,
    fans: fans.slice(0, 9).map((f) => ({ id: f.id, name: f.name, avatar: sharp(f.avatar, 60) })),
    mutual,
    reviewStats
  };
}
