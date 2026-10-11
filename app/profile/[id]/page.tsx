import { prisma } from '@/lib/prisma';
import { canSeeFavorites, FAVORITES_LIST_TITLE } from '@/lib/favoritesVisibility';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { notFound } from 'next/navigation';
import UserBanToggle from '@/components/UserBanToggle';
import UserRestrictionsToggle from '@/components/UserRestrictionsToggle';
import ProfileTabs from '@/components/ProfileTabs';
import ProfileHero from '@/components/profile/ProfileHero';
import ProfileSidebar from '@/components/profile/ProfileSidebar';
import { IconUser } from '@/components/Icons';
import { logActivity } from '@/lib/logActivity';
import { getOnlineStatus } from '@/lib/onlineStatus';
import { loadActivity, loadTaste } from '@/lib/profileData';
import { sharpImage } from '@/lib/imageQuality';
import { getDictionary, getUserLanguage } from '@/lib/i18n';

export const dynamic = 'force-dynamic';

export default async function ProfilePage(props: { params: Promise<{ id: string }> }) {
  const { params } = { ...props, params: await props.params };
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
      favoritesVisibility: true,
      membershipUntil: true,
      role: true,
      isEditor: true,
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
        <h1 className="font-display font-extrabold text-2xl text-ink mb-2">Smazaný uživatel</h1>
        <p className="text-sm text-muted">Tento uživatelský účet byl smazán.</p>
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

  const sharp = (url: string | null | undefined, w: number) => (url ? sharpImage(url, w) || url : null);
  const topLevel = { seasonId: null, episodeId: null };

  const [reviewsRaw, comments, fansRaw, isFollowing, karma, latestRatings, ratingsCount, reviewsCount, taste, activityData] = await Promise.all([
    prisma.review.findMany({
      where: { authorId: user.id, ...topLevel },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        movie: { select: { id: true, title: true, slug: true, poster: true, year: true, releaseDate: true } },
        _count: { select: { comments: true, likes: { where: { value: 1 } } } }
      }
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
      orderBy: { createdAt: 'desc' },
      include: { follower: { select: { id: true, name: true, avatar: true, role: true, membershipUntil: true } } }
    }),
    viewerId ? prisma.follow.findUnique({ where: { followerId_followingId: { followerId: viewerId, followingId: user.id } } }) : null,
    prisma.like.aggregate({
      where: {
        OR: [{ review: { authorId: user.id } }, { comment: { userId: user.id } }, { post: { authorId: user.id } }, { news: { authorId: user.id } }]
      },
      _sum: { value: true }
    }),
    prisma.rating.findMany({
      where: { userId: user.id, ...topLevel },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: { movie: { select: { title: true, slug: true, poster: true, year: true, releaseDate: true } } }
    }),
    prisma.rating.count({ where: { userId: user.id, ...topLevel } }),
    prisma.review.count({ where: { authorId: user.id, ...topLevel } }),
    loadTaste(user.id),
    loadActivity(user.id)
  ]);

  const fans = fansRaw.map((f) => f.follower);
  const karmaValue = karma._sum.value || 0;

  // Hodnotenie autora pri jeho recenziách (zlaté hviezdy na karte recenzie)
  const reviewedMovieIds = reviewsRaw.map((r) => r.movie.id);
  const ownRatings = reviewedMovieIds.length
    ? await prisma.rating.findMany({ where: { userId: user.id, movieId: { in: reviewedMovieIds }, ...topLevel }, select: { movieId: true, value: true } })
    : [];
  const ratingByMovie = new Map(ownRatings.map((r) => [r.movieId, r.value]));

  const blogPosts = await prisma.blogPost.findMany({
    where: {
      authorId: user.id,
      ...(isOwn || viewerIsAdmin ? {} : { published: true })
    },
    orderBy: { createdAt: 'desc' },
    select: { id: true, title: true, coverImage: true, createdAt: true, published: true, isDraft: true }
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
  // Súkromie: zoznam „Obľúbené“ len ak to vlastník dovolil (nastavenie viditeľnosti).
  const showFavorites = await canSeeFavorites(user, viewerId, viewerIsAdmin);
  const visibleLists = movieListsRaw.filter((l) => showFavorites || l.title !== FAVORITES_LIST_TITLE);
  const movieLists = visibleLists.map((l) => ({
    id: l.id,
    title: l.title,
    itemCount: l._count.items,
    items: l.items.map((i) => ({ ...i.movie, poster: sharp(i.movie.poster, 70) }))
  }));

  // Top 3 = prvé tri filmy zo zoznamu „Obľúbené“ (len ak je viditeľný)
  const favorites = showFavorites ? movieListsRaw.find((l) => l.title === FAVORITES_LIST_TITLE) : null;
  const top3 = (favorites?.items || []).slice(0, 3).map((i) => ({ slug: i.movie.slug, title: i.movie.title, poster: sharp(i.movie.poster, 140) }));

  // „Sledujú ho aj ľudia, ktorých sleduješ“
  let mutual: { names: string[]; total: number } | null = null;
  if (viewerId && !isOwn && fans.length) {
    const mine = await prisma.follow.findMany({
      where: { followerId: viewerId, followingId: { in: fans.map((f) => f.id) } },
      select: { followingId: true }
    });
    const ids = new Set(mine.map((m) => m.followingId));
    const names = fans.filter((f) => ids.has(f.id) && !f.name.startsWith('Zmazaný používateľ ')).map((f) => f.name);
    if (names.length) mutual = { names, total: names.length };
  }

  const dict = await getDictionary(await getUserLanguage());
  const t = (k: string, f: string) => dict[k] || f;
  const nf = (n: number) => n.toLocaleString('cs-CZ');

  const membershipActive = !!(user.membershipUntil && user.membershipUntil > new Date());
  const goldenNote =
    isOwn && membershipActive && user.membershipUntil
      ? `${t('profil.golden_aktivni', 'Golden Ticket aktivní ještě')} ${Math.max(1, Math.ceil((user.membershipUntil.getTime() - Date.now()) / 86_400_000))} ${t('profil.dni', 'dní')} (${t('profil.do', 'do')} ${user.membershipUntil.toLocaleDateString('cs-CZ')})`
      : null;
  const backdrop = top3[0]?.poster || sharp(latestRatings[0]?.movie.poster, 300) || sharp(user.avatar, 300);

  const sidebarLabels: Record<string, string> = {
    filmovy_vkus: t('profil.filmovy_vkus', 'Filmový vkus'),
    prumerne_hodnoceni: t('profil.prumerne_hodnoceni', 'průměrné hodnocení'),
    oblibene_zanry: t('profil.oblibene_zanry', 'Oblíbené žánry'),
    aktivita: t('profil.aktivita', 'Aktivita'),
    posledni_4_mesice: t('profil.posledni_4_mesice', 'poslední 4 měsíce'),
    hodnoceni_mn: t('profil.hodnoceni_mn', 'hodnocení'),
    recenzi_mn: t('profil.recenzi_mn', 'recenzí'),
    serie: t('profil.serie', 'Série'),
    dni: t('profil.dni', 'dní'),
    zadna_aktivita: t('profil.zadna_aktivita', 'Zatím bez aktivity'),
    fanklub: t('profil.fanklub', 'Fanklub'),
    fanousku: t('profil.fanousku', 'fanoušků'),
    zadni_fanousci: t('profil.zadni_fanousci', 'Zatím nemá žádné fanoušky.'),
    sledujete_take: t('profil.sledujete_take', 'Sledují ho i lidé, které sleduješ:'),
    a_dalsi: t('profil.a_dalsi', 'a další'),
    kontakt: t('profil.kontakt', 'Kontakt')
  };

  return (
    <div className="pt-4 sm:pt-6 pb-10">
      <ProfileHero
        user={{ id: user.id, name: user.name, avatar: sharp(user.avatar, 150), bio: user.bio, tagline: user.tagline }}
        badges={{ critic: user.role === 'ADMIN', editor: user.role !== 'ADMIN' && user.isEditor, golden: membershipActive, banned: user.banned }}
        online={getOnlineStatus(activity?.createdAt || null)}
        memberSince={`${t('profil.clenem_od', 'Členem od')} ${user.createdAt.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'long', year: 'numeric' })}`}
        place={[user.region, user.country].filter(Boolean).join(', ') || null}
        goldenNote={goldenNote}
        backdrop={backdrop}
        top3={top3}
        stats={[
          { value: nf(ratingsCount), label: t('profil.hodnoceni_mn', 'hodnocení') },
          { value: nf(reviewsCount), label: t('profil.recenzi_mn', 'recenzí') },
          { value: nf(user._count.followedBy), label: t('profil.fanousku', 'fanoušků') },
          { value: nf(user._count.following), label: t('profil.sleduje', 'sleduje'), mobileHidden: true },
          { value: user.role === 'ADMIN' ? '∞' : nf(karmaValue), label: t('profil.karma', 'karma') }
        ]}
        isOwn={isOwn}
        canInteract={!!viewerId}
        isFollowing={!!isFollowing}
        labels={{
          overeny_kritik: t('profil.overeny_kritik', 'OVĚŘENÝ KRITIK'),
          redaktor: t('profil.redaktor', 'REDAKTOR'),
          zablokovany: t('profil.zablokovany', 'ZABLOKOVANÝ'),
          top3: t('profil.top3', 'Top 3 filmy všech dob'),
          online_online: 'Online',
          online_recent: t('profil.online_recent', 'Byl(a) tu nedávno'),
          online_offline: t('profil.online_offline', 'Dnes tu nebyl(a)')
        }}
      />

      {!isOwn && viewerIsAdmin && user.role === 'READER' && (
        <div className="ap-card flex flex-wrap items-center gap-3 p-4 mt-4">
          <span className="ap-label">{t('profil.administrace', 'Administrace')}</span>
          <UserBanToggle id={user.id} banned={user.banned} />
          <UserRestrictionsToggle
            id={user.id}
            initial={{ reviewsDisabled: user.reviewsDisabled, ratingsDisabled: user.ratingsDisabled, commentsDisabled: user.commentsDisabled }}
          />
        </div>
      )}

      <div className="mt-6">
          <ProfileTabs
            userId={user.id}
            reviews={reviewsRaw.map((r) => ({
              id: r.id,
              body: r.body,
              createdAt: r.createdAt.toISOString(),
              movie: { title: r.movie.title, slug: r.movie.slug, poster: sharp(r.movie.poster, 90), year: r.movie.year },
              rating: ratingByMovie.get(r.movie.id) ?? null,
              likeCount: r._count.likes,
              commentCount: r._count.comments
            }))}
            comments={comments.map((c) => ({ ...c, createdAt: c.createdAt.toISOString() }))}
            fans={fans.map((f) => ({ ...f, avatar: sharp(f.avatar, 40) }))}
            latestRatings={latestRatings.map((r) => ({
              ...r,
              createdAt: r.createdAt.toISOString(),
              movie: { ...r.movie, poster: sharp(r.movie.poster, 120), releaseDate: r.movie.releaseDate ? r.movie.releaseDate.toISOString() : null }
            }))}
            bio={user.bio}
            isOwn={isOwn}
            blogPosts={blogPosts.map((p) => ({ ...p, coverImage: sharp(p.coverImage, 400), createdAt: p.createdAt.toISOString() }))}
            movieLists={movieLists}
            counts={{
              ratings: ratingsCount,
              reviews: reviewsCount,
              blog: blogPosts.length,
              lists: movieLists.length,
              comments: comments.length, // zobrazuje sa posledných 30
              fans: user._count.followedBy
            }}
            sidebar={
              <ProfileSidebar
            taste={taste}
            activity={activityData}
            fans={fans.map((f) => ({ id: f.id, name: f.name, avatar: sharp(f.avatar, 60) }))}
            fanCount={user._count.followedBy}
            mutual={mutual}
            contact={user}
            deletedLabel={t('user.zmazany_pouzivatel', 'Smazaný uživatel')}
            L={sidebarLabels}
              />
            }
          />
      </div>
    </div>
  );
}
