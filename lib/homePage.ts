import { prisma } from '@/lib/prisma';
import { movieVisibleFilter } from '@/lib/publishedFilter';
import { getBirthdaysToday } from '@/lib/peopleToday';
import { getVerifiedCriticIds } from '@/lib/criticStatus';
import { getRecommendationsForUser } from '@/lib/recommendations';
import { getWeekendBoxOffice } from '@/lib/weekendBoxOffice';
import { getRecentlyViewedSafe } from '@/lib/recentlyViewed';
import { getFanFavorites, FAN_ROW_LIMIT } from '@/lib/fanFavorites';
import { getTop10 } from '@/lib/top10';
import { excerpt } from '@/lib/markdown';
import { loadMostRead, plainImg } from '@/lib/articleData';
import { primaryGenreLabel } from '@/lib/genreLabel';
import { img, getHomePulse, getHeroTrailers, getUpcomingPremieres, getHomeNews, getPopularSeries, getTopPeople, getTopVideos, getTopProfiles, matchPercent } from '@/lib/homeData';

// ---------------------------------------------------------------------------
// Všetky údaje novej hlavnej stránky naraz — web (app/page.tsx) aj appka
// (/api/mobile/home) volajú túto istú funkciu, takže ukazujú to isté.
// ---------------------------------------------------------------------------

const REVIEW_SELECT = {
  id: true,
  body: true,
  authorId: true,
  movieId: true,
  createdAt: true,
  movie: { select: { id: true, slug: true, title: true, year: true, poster: true } },
  author: { select: { id: true, name: true, avatar: true } },
  _count: { select: { likes: { where: { value: 1 } } } }
} as const;

export type HomeReviewData = {
  id: string;
  text: string;
  rating: number;
  likes: number;
  createdAt: string;
  movie: { id: string; slug: string; title: string; year: string | null; poster: string | null };
  author: { id: string; name: string; avatar: string | null; critic: boolean };
};

export async function loadHomePage({ viewerId, isMember, personalizationAllowed }: { viewerId: string | null; isMember: boolean; personalizationAllowed: boolean }) {
  const visible = movieVisibleFilter(isMember);
  const [
    pulse,
    trailers,
    premieres,
    top10,
    fanData,
    recommendations,
    news,
    mostRead,
    series,
    weekend,
    latestRaw,
    criticIds,
    following,
    actors,
    creators,
    birthdays,
    deceasedRaw,
    videos,
    profiles,
    recentlyViewed
  ] = await Promise.all([
    getHomePulse().catch(() => ({ ratingsToday: 0, reviewsToday: 0, newMoviesWeek: 0, online: 0 })),
    getHeroTrailers(isMember, viewerId).catch((e) => {
      console.error('[home trailers]', e);
      return [];
    }),
    getUpcomingPremieres(8, isMember).catch(() => []),
    getTop10(viewerId),
    getFanFavorites(viewerId),
    viewerId ? getRecommendationsForUser(viewerId).catch(() => ({ movies: [], topGenres: [] as string[] })) : Promise.resolve({ movies: [], topGenres: [] as string[] }),
    getHomeNews(isMember, 3).catch(() => []),
    loadMostRead('news', '', plainImg, '', isMember).catch(() => []),
    getPopularSeries(visible, 5).catch(() => []),
    getWeekendBoxOffice().catch(() => null),
    prisma.review.findMany({ where: { movie: { approved: true }, seasonId: null, episodeId: null }, orderBy: { createdAt: 'desc' }, take: 4, select: REVIEW_SELECT }),
    getVerifiedCriticIds(),
    viewerId && personalizationAllowed ? prisma.follow.findMany({ where: { followerId: viewerId }, select: { followingId: true } }) : Promise.resolve([] as { followingId: string }[]),
    getTopPeople('ACTOR', 10).catch(() => []),
    getTopPeople('CREATOR', 10).catch(() => []),
    getBirthdaysToday(10).catch(() => []),
    prisma.person.findMany({
      where: { approved: true, deathDate: { not: null }, photo: { not: null } },
      orderBy: { deathDate: 'desc' },
      take: 20,
      select: { id: true, name: true, slug: true, photo: true, birthDate: true, deathDate: true }
    }),
    getTopVideos(3, isMember).catch(() => []),
    getTopProfiles(4).catch(() => []),
    getRecentlyViewedSafe(viewerId)
  ]);

  // ---------- Recenzie: nové / overení kritici / od obľúbených ----------
  const criticList = Array.from(criticIds);
  const followingIds = following.map((f) => f.followingId);
  const [criticRaw, favRaw] = await Promise.all([
    criticList.length
      ? prisma.review.findMany({ where: { authorId: { in: criticList }, movie: { approved: true }, seasonId: null, episodeId: null }, orderBy: { createdAt: 'desc' }, take: 4, select: REVIEW_SELECT })
      : Promise.resolve([]),
    followingIds.length
      ? prisma.review.findMany({ where: { authorId: { in: followingIds }, movie: { approved: true }, seasonId: null, episodeId: null }, orderBy: { createdAt: 'desc' }, take: 4, select: REVIEW_SELECT })
      : Promise.resolve([])
  ]);
  const all = [...latestRaw, ...criticRaw, ...favRaw];
  const pairs = Array.from(new Map(all.map((r) => [`${r.movieId}:${r.authorId}`, { movieId: r.movieId, userId: r.authorId }])).values());
  const own = pairs.length ? await prisma.rating.findMany({ where: { seasonId: null, episodeId: null, OR: pairs }, select: { movieId: true, userId: true, value: true } }) : [];
  const ratingBy = new Map(own.map((r) => [`${r.movieId}:${r.userId}`, r.value]));
  const toReview = (r: (typeof latestRaw)[number]): HomeReviewData => ({
    id: r.id,
    text: excerpt(r.body, 200),
    rating: ratingBy.get(`${r.movieId}:${r.authorId}`) || 0,
    likes: r._count.likes,
    createdAt: r.createdAt.toISOString(),
    movie: { id: r.movie.id, slug: r.movie.slug, title: r.movie.title, year: r.movie.year, poster: img(r.movie.poster, 92) },
    author: { id: r.author.id, name: r.author.name, avatar: img(r.author.avatar, 28), critic: criticIds.has(r.author.id) }
  });

  // ---------- Osobnosti ----------
  const seen = new Set<string>();
  const thisYear = new Date().getFullYear();
  const deceased = deceasedRaw
    .filter((p) => (seen.has(p.name) ? false : (seen.add(p.name), true)))
    .slice(0, 10)
    .map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      photo: img(p.photo, 150),
      years: [p.birthDate ? new Date(p.birthDate).getFullYear() : null, p.deathDate ? new Date(p.deathDate).getFullYear() : null].filter(Boolean).join('–') || null
    }));
  const birthdaysOut = birthdays.map((p) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    photo: img(p.photo, 150),
    age: p.birthDate ? thisYear - new Date(p.birthDate).getFullYear() : null
  }));

  // ---------- Rady plagátov ----------
  const recIds = recommendations.movies.map((m: any) => m.id as string);
  const recWatch = viewerId && recIds.length ? await prisma.watchlistItem.findMany({ where: { userId: viewerId, movieId: { in: recIds } }, select: { movieId: true } }) : [];
  const recInWatch = new Set(recWatch.map((w) => w.movieId));
  const recommended = recommendations.movies.map((m: any) => ({
    id: m.id as string,
    slug: m.slug as string,
    title: m.title as string,
    poster: img(m.poster, 150),
    percent: (m.percent ?? null) as number | null,
    year: (m.year ?? null) as string | null,
    genre: primaryGenreLabel(((m.genres as string) || '').split(',').map((g) => g.trim()).filter(Boolean)) as string | null,
    contentType: (m.contentType ?? null) as string | null,
    inWatchlist: recInWatch.has(m.id),
    match: matchPercent(m.matchCount || 0, recommendations.topGenres.length, m.percent ?? null)
  }));
  const fans = fanData.items.slice(0, FAN_ROW_LIMIT).map((m) => ({
    id: m.id,
    slug: m.slug,
    title: m.title,
    poster: img(m.poster, 150),
    percent: m.percent,
    year: m.year,
    contentType: m.contentType,
    inWatchlist: m.inWatchlist
  }));
  const top10Items = top10.items.map((m) => ({
    id: m.id,
    slug: m.slug,
    title: m.title,
    poster: img(m.poster, 136),
    percent: m.percent,
    contentType: m.contentType,
    move: m.move,
    prevRank: m.prevRank,
    inWatchlist: m.inWatchlist
  }));

  return {
    pulse,
    trailers,
    premieres,
    top10: { items: top10Items, showMoves: top10.items.some((m) => m.prevRank !== null) },
    fans,
    recommendations: { items: recommended, topGenres: recommendations.topGenres },
    news,
    mostRead: mostRead
      .filter((a) => typeof a.href === 'string' && a.href.length > 0)
      .map((a) => {
        const href = a.href as string;
        return { id: a.key, title: a.title, href, slug: href.replace(/^\/news\//, '') };
      }),
    series,
    weekend: weekend ? { weekendStart: weekend.weekendStart, weekendEnd: weekend.weekendEnd, entries: (weekend.entries || []).slice(0, 5) } : null,
    reviews: { latest: latestRaw.map(toReview), critics: criticRaw.map(toReview), favorites: favRaw.map(toReview) },
    people: { actors, creators, birthdays: birthdaysOut, deceased },
    videos,
    profiles,
    recentlyViewed: recentlyViewed.map((m) => ({ ...m, poster: img(m.poster, 44) }))
  };
}

export type HomePageData = Awaited<ReturnType<typeof loadHomePage>>;
