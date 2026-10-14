import { unstable_cache } from 'next/cache';
import { prisma } from './prisma';
import { computeBlendedPercent } from './rating';
import { sharpImage } from './imageQuality';
import { readingTime, youtubeVideoId } from './markdown';
import { publishedNewsFilterForMember, movieVisibleFilter } from './publishedFilter';

// ---------------------------------------------------------------------------
// Údaje pre novú hlavnú stránku (web app/page.tsx aj appka /api/mobile/home).
// Spoločné výpočty sú tu, nech web aj appka ukazujú presne to isté.
// ---------------------------------------------------------------------------

export const img = (url: string | null | undefined, w: number) => (url ? sharpImage(url, w) || url : null);

const splitList = (s: string | null | undefined) =>
  (s || '')
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);

function formatRuntime(min: number | null | undefined) {
  if (!min || min <= 0) return null;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h ? `${h} h${m ? ` ${m} min` : ''}` : `${m} min`;
}

// Dátumy v pražskom čase (server beží v UTC) — rovnaký výsledok na serveri aj v prehliadači
export const TZ = 'Europe/Prague';
export const pragueDay = (d: Date | string) => new Date(d).toLocaleDateString('en-CA', { timeZone: TZ });
export function daysUntil(iso: string) {
  const a = Date.parse(pragueDay(iso));
  const b = Date.parse(pragueDay(new Date()));
  return Math.round((a - b) / 86400000);
}

// ---------- Pulz webu (čísla v úvode) — cache 5 minút ----------
export type HomePulse = { ratingsToday: number; reviewsToday: number; newMoviesWeek: number; online: number };

export const getHomePulse = unstable_cache(
  async (): Promise<HomePulse> => {
    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);
    const weekAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000);
    const onlineSince = new Date(Date.now() - 15 * 60 * 1000);
    const [ratingsToday, reviewsToday, newMoviesWeek, online] = await Promise.all([
      prisma.rating.count({ where: { createdAt: { gte: dayStart } } }),
      prisma.review.count({ where: { createdAt: { gte: dayStart } } }),
      prisma.movie.count({ where: { approved: true, createdAt: { gte: weekAgo } } }),
      prisma.user.count({ where: { deleted: false, banned: false, lastActiveAt: { gte: onlineSince } } })
    ]);
    return { ratingsToday, reviewsToday, newMoviesWeek, online };
  },
  ['home-pulse-v1'],
  { revalidate: 300 }
);

// ---------- Trailery v úvode: k traileru aj detail filmu ----------
export type HeroTrailer = {
  id: string;
  title: string;
  kind: string;
  youtubeId: string;
  subtitles: { startTime: number; endTime: number; text: string }[];
  image: string | null;
  thumb: string | null;
  poster: string | null;
  hasSubtitles: boolean;
  movie: {
    id: string;
    slug: string;
    title: string;
    year: string | null;
    genres: string[];
    runtime: string | null;
    director: string | null;
    synopsis: string | null;
    percent: number | null;
    premiere: string | null; // ISO dátum najbližšej kinopremiéry (ak je v budúcnosti)
    cast: { name: string; slug: string; photo: string | null }[];
    inWatchlist: boolean;
  };
};

export async function getHeroTrailers(isMember: boolean, viewerId: string | null): Promise<HeroTrailer[]> {
  const candidates = await prisma.movieVideo.findMany({
    where: { category: 'trailer', featuredOnHome: true, episodeId: null, seasonId: null, movie: { approved: true, ...movieVisibleFilter(isMember) } },
    orderBy: { createdAt: 'desc' },
    take: 20,
    select: {
      id: true,
      title: true,
      url: true,
      previewImage: true,
      createdAt: true,
      movieId: true,
      _count: { select: { subtitles: true } }
    }
  });
  // Najprv trailery s titulkami, potom najnovšie (rovnako ako doteraz)
  const pick = [...candidates]
    .sort((a, b) => {
      const d = (b._count.subtitles > 0 ? 1 : 0) - (a._count.subtitles > 0 ? 1 : 0);
      return d || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    })
    .filter((v) => youtubeVideoId(v.url))
    .slice(0, 5);
  if (!pick.length) return [];

  const movieIds = Array.from(new Set(pick.map((v) => v.movieId)));
  const today = new Date(new Date().setHours(0, 0, 0, 0));
  const [movies, subs, watch] = await Promise.all([
    prisma.movie.findMany({
      where: { id: { in: movieIds } },
      select: {
        id: true,
        slug: true,
        title: true,
        year: true,
        poster: true,
        genres: true,
        runtimeMinutes: true,
        director: true,
        synopsis: true,
        cast: true,
        tmdbVoteAverage: true,
        tmdbVoteCount: true,
        ratings: { where: { seasonId: null, episodeId: null }, select: { value: true } },
        premiereDates: { where: { releaseDate: { gte: today }, type: { not: 'VOD' } }, orderBy: { releaseDate: 'asc' }, take: 1, select: { releaseDate: true } }
      }
    }),
    prisma.videoSubtitle.findMany({
      where: { movieVideoId: { in: pick.map((v) => v.id) } },
      orderBy: { startTime: 'asc' },
      select: { movieVideoId: true, startTime: true, endTime: true, text: true }
    }),
    viewerId ? prisma.watchlistItem.findMany({ where: { userId: viewerId, movieId: { in: movieIds } }, select: { movieId: true } }) : Promise.resolve([] as { movieId: string }[])
  ]);
  const castNames = Array.from(new Set(movies.flatMap((m) => splitList(m.cast).slice(0, 4))));
  const people = castNames.length
    ? await prisma.person.findMany({ where: { name: { in: castNames }, approved: true }, select: { name: true, slug: true, photo: true } })
    : [];
  const personBy = new Map(people.map((p) => [p.name, p]));
  const movieBy = new Map(movies.map((m) => [m.id, m]));
  const inWatch = new Set(watch.map((w) => w.movieId));

  return pick
    .map((v) => {
      const m = movieBy.get(v.movieId);
      if (!m) return null;
      const yt = youtubeVideoId(v.url)!;
      const synopsis = (m.synopsis || '').replace(/\s+/g, ' ').trim();
      return {
        id: v.id,
        title: v.title || m.title,
        kind: v.title && v.title !== m.title ? v.title : 'Trailer',
        youtubeId: yt,
        subtitles: subs.filter((s) => s.movieVideoId === v.id).map((s) => ({ startTime: s.startTime, endTime: s.endTime, text: s.text })),
        // Široký záber: vlastný náhľad traileru, inak záber z YouTube (plagát je na výšku)
        image: v.previewImage ? img(v.previewImage, 1200) : `https://img.youtube.com/vi/${yt}/maxresdefault.jpg`,
        thumb: v.previewImage ? img(v.previewImage, 120) : `https://img.youtube.com/vi/${yt}/mqdefault.jpg`,
        poster: img(m.poster, 300),
        hasSubtitles: v._count.subtitles > 0,
        movie: {
          id: m.id,
          slug: m.slug,
          title: m.title,
          year: m.year,
          genres: splitList(m.genres).slice(0, 2),
          runtime: formatRuntime(m.runtimeMinutes),
          director: splitList(m.director)[0] || null,
          synopsis: synopsis ? synopsis.slice(0, 260) : null,
          percent: computeBlendedPercent(m.ratings, m.tmdbVoteAverage, m.tmdbVoteCount),
          premiere: m.premiereDates[0]?.releaseDate ? m.premiereDates[0].releaseDate.toISOString() : null,
          cast: splitList(m.cast)
            .slice(0, 4)
            .map((n) => personBy.get(n))
            .filter((p): p is NonNullable<typeof p> => !!p)
            .map((p) => ({ name: p.name, slug: p.slug, photo: img(p.photo, 30) })),
          inWatchlist: inWatch.has(m.id)
        }
      };
    })
    .filter((x): x is HeroTrailer => !!x);
}

// ---------- V kinech brzy ----------
export type HomePremiere = { id: string; slug: string; title: string; poster: string | null; genre: string | null; date: string };

export async function getUpcomingPremieres(limit = 8, isMember = false): Promise<HomePremiere[]> {
  const rows = await prisma.moviePremiereDate.findMany({
    where: { releaseDate: { gte: new Date(new Date().setHours(0, 0, 0, 0)) }, type: { not: 'VOD' }, movie: { approved: true, ...movieVisibleFilter(isMember) } },
    orderBy: { releaseDate: 'asc' },
    take: 60,
    select: { releaseDate: true, movie: { select: { id: true, title: true, slug: true, poster: true, genres: true } } }
  });
  const seen = new Set<string>();
  const out: HomePremiere[] = [];
  for (const r of rows) {
    if (seen.has(r.movie.id)) continue;
    seen.add(r.movie.id);
    out.push({ id: r.movie.id, slug: r.movie.slug, title: r.movie.title, poster: img(r.movie.poster, 104), genre: splitList(r.movie.genres)[0] || null, date: r.releaseDate.toISOString() });
    if (out.length >= limit) break;
  }
  return out;
}

// ---------- Novinky (hlavný článok + 2 ďalšie) ----------
export type HomeNews = {
  id: string;
  slug: string;
  title: string;
  image: string | null;
  movieTitle: string | null;
  createdAt: string;
  minutes: number;
  comments: number;
  author: { name: string; avatar: string | null } | null;
};

export async function getHomeNews(isMember: boolean, take = 3): Promise<HomeNews[]> {
  const rows = await prisma.newsPost.findMany({
    where: publishedNewsFilterForMember(isMember),
    orderBy: { createdAt: 'desc' },
    take,
    select: {
      id: true,
      slug: true,
      title: true,
      body: true,
      coverImage: true,
      createdAt: true,
      movie: { select: { title: true } },
      author: { select: { name: true, avatar: true, deleted: true } },
      _count: { select: { comments: { where: { parentId: null } } } }
    }
  });
  return rows.map((n, i) => ({
    id: n.id,
    slug: n.slug,
    title: n.title,
    image: img(n.coverImage, i === 0 ? 700 : 400),
    movieTitle: n.movie?.title || null,
    createdAt: n.createdAt.toISOString(),
    minutes: readingTime(n.body),
    comments: n._count.comments,
    author: n.author && !n.author.deleted ? { name: n.author.name, avatar: img(n.author.avatar, 24) } : null
  }));
}

// ---------- Najsledovanejšie seriály ----------
export async function getPopularSeries(isMemberFilter: object, take = 5) {
  const rows = await prisma.movie.findMany({
    where: { approved: true, contentType: 'Seriál', ...isMemberFilter },
    orderBy: { ratings: { _count: 'desc' } },
    take,
    select: {
      id: true,
      title: true,
      slug: true,
      year: true,
      poster: true,
      genres: true,
      tmdbVoteAverage: true,
      tmdbVoteCount: true,
      ratings: { where: { seasonId: null, episodeId: null }, select: { value: true } },
      _count: { select: { seasons: true } }
    }
  });
  return rows.map((s) => ({
    id: s.id,
    slug: s.slug,
    title: s.title,
    year: s.year,
    poster: img(s.poster, 42),
    genre: splitList(s.genres)[0] || null,
    seasons: s._count.seasons,
    percent: computeBlendedPercent(s.ratings, s.tmdbVoteAverage, s.tmdbVoteCount)
  }));
}

// ---------- Osobnosti s počtom fanúšikov ----------
export async function getTopPeople(role: 'ACTOR' | 'CREATOR', take = 10) {
  const rows = await prisma.person.findMany({
    where: { role, approved: true, photo: { not: null } },
    orderBy: { followers: { _count: 'desc' } },
    take,
    select: { id: true, name: true, slug: true, photo: true, _count: { select: { followers: true } } }
  });
  return rows.map((p) => ({ id: p.id, name: p.name, slug: p.slug, photo: img(p.photo, 150), fans: p._count.followers }));
}

// ---------- Najsledovanejšie videá (48 h) ----------
export async function getTopVideos(take = 3, isMember = false) {
  const since = new Date(Date.now() - 48 * 3600 * 1000);
  const views = await prisma.trailerView.groupBy({
    by: ['movieVideoId'],
    where: { viewedAt: { gte: since }, movieVideoId: { not: null } },
    _count: { movieVideoId: true },
    orderBy: { _count: { movieVideoId: 'desc' } },
    take
  });
  const ids = views.map((v) => v.movieVideoId).filter((x): x is string => !!x);
  if (!ids.length) return [];
  const videos = await prisma.movieVideo.findMany({
    where: { id: { in: ids }, movie: { approved: true, ...movieVisibleFilter(isMember) } },
    select: { id: true, title: true, url: true, previewImage: true, movie: { select: { slug: true, title: true, poster: true } } }
  });
  const by = new Map(videos.map((v) => [v.id, v]));
  return views
    .map((v) => {
      const video = v.movieVideoId ? by.get(v.movieVideoId) : null;
      if (!video) return null;
      const yt = youtubeVideoId(video.url);
      return {
        id: video.id,
        title: video.title || video.movie.title,
        slug: video.movie.slug,
        views: v._count.movieVideoId,
        image: img(video.previewImage, 320) || (yt ? `https://img.youtube.com/vi/${yt}/mqdefault.jpg` : img(video.movie.poster, 320))
      };
    })
    .filter((x): x is NonNullable<typeof x> => !!x);
}

// ---------- Najnavštevovanejšie profily (24 h) ----------
export async function getTopProfiles(take = 4) {
  const since = new Date(Date.now() - 24 * 3600 * 1000);
  const visits = await prisma.profileVisit.groupBy({
    by: ['profileOwnerId'],
    where: { visitedAt: { gte: since } },
    _count: { profileOwnerId: true },
    orderBy: { _count: { profileOwnerId: 'desc' } },
    take: take + 3
  });
  if (!visits.length) return [];
  const users = await prisma.user.findMany({
    where: { id: { in: visits.map((v) => v.profileOwnerId) }, banned: false, deleted: false },
    select: { id: true, name: true, avatar: true, role: true, membershipUntil: true, _count: { select: { reviews: true, ratings: true } } }
  });
  const by = new Map(users.map((u) => [u.id, u]));
  const now = Date.now();
  return visits
    .map((v) => by.get(v.profileOwnerId))
    .filter((u): u is NonNullable<typeof u> => !!u)
    .slice(0, take)
    .map((u) => ({
      id: u.id,
      name: u.name,
      avatar: img(u.avatar, 38),
      critic: u.role === 'ADMIN',
      golden: !!(u.membershipUntil && new Date(u.membershipUntil).getTime() > now),
      reviews: u._count.reviews,
      ratings: u._count.ratings
    }));
}

// ---------- Zhoda s vkusom pri odporúčaniach ----------
// matchCount = koľko z obľúbených žánrov film má; percent = hodnotenie filmu.
export function matchPercent(matchCount: number, genreCount: number, percent: number | null) {
  const genre = genreCount ? matchCount / genreCount : 0;
  return Math.max(50, Math.min(99, Math.round(55 + genre * 30 + ((percent ?? 60) - 60) * 0.35)));
}
