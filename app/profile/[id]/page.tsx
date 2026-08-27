import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import CriticBadge from '@/components/CriticBadge';
import GoldenTicketBadge from '@/components/GoldenTicketBadge';
import Badge from '@/components/Badge';
import UserBanToggle from '@/components/UserBanToggle';
import UserRestrictionsToggle from '@/components/UserRestrictionsToggle';
import FollowButton from '@/components/FollowButton';
import ProfileTabs from '@/components/ProfileTabs';
import ProfileContactInfo from '@/components/ProfileContactInfo';
import GenreDistributionChart from '@/components/GenreDistributionChart';
import OnlineStatusDot from '@/components/OnlineStatusDot';
import FanklubBox from '@/components/FanklubBox';
import { IconUser, IconMessage, IconHeart } from '@/components/Icons';
import { logActivity } from '@/lib/logActivity';

export const dynamic = 'force-dynamic';

export default async function ProfilePage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const viewerId = (session?.user as any)?.id;
  const viewerIsAdmin = (session?.user as any)?.role === 'ADMIN';

  const user = await prisma.user.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      name: true,
      avatar: true,
      bio: true,
      membershipUntil: true,
      role: true,
      banned: true,
      reviewsDisabled: true,
      ratingsDisabled: true,
      commentsDisabled: true,
      deleted: true,
      createdAt: true,
      firstName: true,
      lastName: true,
      tagline: true,
      email: true,
      hideEmail: true,
      homepage: true,
      facebookUrl: true,
      instagramUrl: true,
      tiktokUrl: true,
      xUrl: true,
      youtubeUrl: true,
      spotifyUrl: true,
      linkedinUrl: true,
      snapchatUrl: true,
      blueskyUrl: true,
      country: true,
      region: true,
      _count: { select: { comments: true, reviews: true, followedBy: true, following: true } }
    }
  });

  if (!user) return notFound();

  if (user.deleted) {
    return (
      <div className="pt-16 text-center">
        <div className="w-20 h-20 rounded-full bg-surface flex items-center justify-center mx-auto mb-4">
          <IconUser className="w-8 h-8 text-muted" />
        </div>
        <h1 className="font-display font-extrabold text-2xl text-ink mb-2">Zmazaný používateľ</h1>
        <p className="text-sm text-muted">Tento používateľský účet bol zmazaný.</p>
      </div>
    );
  }

  // Zaznamenaj návštevu (nie vlastného profilu, a nie ak si sem prišiel pred menej ako 30 minútami)
  if (viewerId && viewerId !== user.id) {
    const lastVisit = await prisma.profileVisit.findFirst({
      where: { visitorId: viewerId, profileOwnerId: user.id },
      orderBy: { visitedAt: 'desc' }
    });
    const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000);
    if (!lastVisit || lastVisit.visitedAt < thirtyMinAgo) {
      await prisma.profileVisit.create({ data: { visitorId: viewerId, profileOwnerId: user.id } });
    }
  }
  if (viewerId) {
    logActivity(viewerId, `Profil používateľa ${user.name}`, `/profile/${user.id}`);
  }
  const isOwn = viewerId === user.id;

  const activity = await prisma.userActivity.findUnique({ where: { userId: user.id }, select: { createdAt: true } });

  const [reviews, comments, fansRaw, isFollowing, karma, latestRatings] = await Promise.all([
    prisma.review.findMany({
      where: { authorId: user.id, seasonId: null, episodeId: null },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: { movie: { select: { title: true, slug: true, poster: true, year: true, releaseDate: true } } }
    }),
    prisma.comment.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 30,
      include: {
        review: { include: { movie: { select: { title: true, slug: true } } } },
        news: { select: { title: true, slug: true } },
        movie: { select: { title: true, slug: true } }
      }
    }),
    prisma.follow.findMany({
      where: { followingId: user.id },
      include: { follower: { select: { id: true, name: true, avatar: true, role: true, membershipUntil: true } } }
    }),
    viewerId
      ? prisma.follow.findUnique({ where: { followerId_followingId: { followerId: viewerId, followingId: user.id } } })
      : null,
    prisma.like.aggregate({
      where: {
        OR: [{ review: { authorId: user.id } }, { comment: { userId: user.id } }, { post: { authorId: user.id } }, { news: { authorId: user.id } }]
      },
      _sum: { value: true }
    }),
    prisma.rating.findMany({
      where: { userId: user.id, seasonId: null, episodeId: null },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: { movie: { select: { title: true, slug: true, poster: true, year: true, releaseDate: true } } }
    })
  ]);

  const fans = fansRaw.map((f) => f.follower);
  const karmaValue = karma._sum.value || 0;

  const blogPosts = await prisma.blogPost.findMany({
    where: {
      authorId: user.id,
      ...(isOwn || viewerIsAdmin ? {} : { published: true })
    },
    orderBy: { createdAt: 'desc' },
    select: { id: true, title: true, coverImage: true, createdAt: true, published: true }
  });

  const movieListsRaw = await prisma.movieList.findMany({
    where: { authorId: user.id },
    orderBy: { createdAt: 'desc' },
    include: {
      items: {
        orderBy: { order: 'asc' },
        take: 10,
        select: { movie: { select: { slug: true, title: true, poster: true, year: true } } }
      },
      _count: { select: { items: true } }
    }
  });
  const movieLists = movieListsRaw.map((l) => ({
    id: l.id,
    title: l.title,
    itemCount: l._count.items,
    items: l.items.map((i) => i.movie)
  }));

  const userRatings = await prisma.rating.findMany({
    where: { userId: user.id, seasonId: null, episodeId: null },
    select: { movie: { select: { genres: true } } }
  });
  const genreCountMap = new Map<string, number>();
  for (const r of userRatings) {
    const genres = (r.movie.genres || '').split(',').map((g) => g.trim()).filter(Boolean);
    for (const g of genres) genreCountMap.set(g, (genreCountMap.get(g) || 0) + 1);
  }
  const genreCounts = Array.from(genreCountMap.entries())
    .map(([genre, count]) => ({ genre, count }))
    .sort((a, b) => b.count - a.count);

  return (
    <div className="pt-10 grid lg:grid-cols-[1fr_260px] gap-6">
      <div>
      <div className="grid sm:grid-cols-2 gap-4 mb-6 items-start">
      <div className="border border-line rounded-xl p-5">
      <div className="flex items-start gap-5 flex-wrap">
        <div className="relative flex-none">
          {user.avatar ? (
            <img src={user.avatar} alt={user.name} className="w-24 h-24 rounded-full object-cover bg-surface" />
          ) : (
            <div className="w-24 h-24 rounded-full bg-surface flex items-center justify-center">
              <IconUser className="w-10 h-10 text-muted" />
            </div>
          )}
          <span className="absolute bottom-1 right-1">
            <OnlineStatusDot lastActivityAt={activity?.createdAt || null} size="w-4 h-4" />
          </span>
        </div>

        <div className="flex-1 min-w-[180px]">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="font-display font-extrabold text-2xl text-ink">{user.name}</h1>
            {user.role === 'ADMIN' && <CriticBadge size="w-4 h-4" />}
            {user.membershipUntil && user.membershipUntil > new Date() && <GoldenTicketBadge size={20} />}
            {user.banned && (
              <Badge tone="danger">Zablokovaný</Badge>
            )}
            <Badge tone="accent" className="ml-auto sm:ml-0" title="Karma — súčet lajkov mínus dislajkov na jeho recenzie, komentáre, novinky a diskusné príspevky">
              <IconHeart className="w-3.5 h-3.5" filled />
              {user.role === 'ADMIN' ? '∞' : karmaValue} karma
            </Badge>
          </div>
          <div className="text-sm text-muted mt-1">
            registrovaný {new Date(user.createdAt).toLocaleDateString('sk-SK')}
          </div>
          {(user.region || user.country) && (
            <div className="text-sm text-muted mt-0.5">{[user.region, user.country].filter(Boolean).join(', ')}</div>
          )}
          <div className="flex items-center gap-3 mt-3 flex-wrap">
            {isOwn && (
              <Link href="/profile/edit" className="text-accent font-semibold text-sm hover:underline">
                Upraviť profil
              </Link>
            )}
            {!isOwn && viewerId && (
              <>
                <FollowButton targetId={user.id} initialFollowing={!!isFollowing} />
                <Link
                  href={`/messages/${user.id}`}
                  className="flex items-center gap-1.5 text-sm font-semibold text-ink border border-line rounded-full px-4 py-2 hover:border-accent hover:text-accent"
                >
                  <IconMessage className="w-4 h-4" /> Napísať správu
                </Link>
              </>
            )}
            {!isOwn && viewerIsAdmin && user.role === 'READER' && (
              <div className="flex items-center gap-2 flex-wrap w-full">
                <UserBanToggle id={user.id} banned={user.banned} />
                <UserRestrictionsToggle
                  id={user.id}
                  initial={{ reviewsDisabled: user.reviewsDisabled, ratingsDisabled: user.ratingsDisabled, commentsDisabled: user.commentsDisabled }}
                />
              </div>
            )}
          </div>
        </div>
      </div>
      </div>

      <GenreDistributionChart genreCounts={genreCounts} />
      </div>

      <ProfileContactInfo user={user} />

      <ProfileTabs
        userId={user.id}
        reviews={reviews.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() }))}
        comments={comments.map((c) => ({ ...c, createdAt: c.createdAt.toISOString() }))}
        fans={fans}
        latestRatings={latestRatings.map((r) => ({
          ...r,
          createdAt: r.createdAt.toISOString(),
          movie: { ...r.movie, releaseDate: r.movie.releaseDate ? r.movie.releaseDate.toISOString() : null }
        }))}
        bio={user.bio}
        isOwn={isOwn}
        blogPosts={blogPosts.map((p) => ({ ...p, createdAt: p.createdAt.toISOString() }))}
        movieLists={movieLists}
      />
      </div>

      <div>
        <FanklubBox karma={karmaValue} isAdmin={user.role === 'ADMIN'} fans={fans} />
      </div>
    </div>
  );
}
