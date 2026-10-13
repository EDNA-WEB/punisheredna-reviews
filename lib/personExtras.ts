import { prisma } from './prisma';
import { computeBlendedPercent } from './rating';
import { sharpImage } from './imageQuality';
import { publishedNewsFilterForMember } from './publishedFilter';
import { findFrequentCollaborators } from './collaborators';
import { careerStats, creatorJob, filmographyYears, genreShare, visibleFanFilter } from './personData';
import type { FilmographyCategory } from './personFilmography';

// Doplnky pre nový profil osobnosti v appke (/api/mobile/person-profile) —
// rovnaké údaje ako nový web (app/osobnost/[slug]/page.tsx).

const sharp = (url: string | null | undefined, w: number) => (url ? sharpImage(url, w) || url : null);

export async function loadPersonExtras(opts: {
  person: { id: string; name: string; role: 'ACTOR' | 'CREATOR'; birthDate: Date | null; deathDate: Date | null };
  categories: FilmographyCategory[] | null;
  viewerId: string | null;
  viewerIsMember: boolean;
}) {
  const { person, categories, viewerId } = opts;
  const movieSelect = {
    id: true,
    title: true,
    slug: true,
    year: true,
    poster: true,
    genres: true,
    director: true,
    screenplay: true,
    cinematography: true,
    music: true,
    tmdbVoteAverage: true,
    tmdbVoteCount: true,
    ratings: { where: { seasonId: null, episodeId: null }, select: { value: true } }
  } as const;
  const movies =
    person.role === 'ACTOR'
      ? await prisma.movie.findMany({ where: { approved: true, cast: { contains: person.name, mode: 'insensitive' } }, orderBy: { year: 'desc' }, select: movieSelect })
      : await prisma.movie.findMany({
          where: {
            approved: true,
            OR: [
              { director: { contains: person.name, mode: 'insensitive' } },
              { screenplay: { contains: person.name, mode: 'insensitive' } },
              { cinematography: { contains: person.name, mode: 'insensitive' } },
              { music: { contains: person.name, mode: 'insensitive' } }
            ]
          },
          orderBy: { year: 'desc' },
          select: movieSelect
        });
  const movieIds = movies.map((m) => m.id);

  const earliest = person.birthDate ? new Date(person.birthDate).getFullYear() : 1888;
  const titles = filmographyYears(categories, earliest);
  const years = titles.map((t) => t.year);
  const careerSpan = years.length ? { from: Math.min(...years), to: person.deathDate ? new Date(person.deathDate).getFullYear() : null } : null;

  const characterBySlug = new Map<string, string>();
  for (const c of categories || []) {
    if (person.role === 'ACTOR' && c.key !== 'acting') continue;
    for (const it of c.items) if (it.ourSlug && it.roleLabel && !characterBySlug.has(it.ourSlug)) characterBySlug.set(it.ourSlug, it.roleLabel);
  }
  // Funkcie tvorcu — appka si ich preloží sama (kľúče director/screenplay/…)
  const jobKeys = { director: 'director', screenplay: 'screenplay', cinematography: 'cinematography', music: 'music' };
  const ourMovies = movies
    .map((m) => ({
      slug: m.slug,
      title: m.title,
      year: m.year,
      poster: sharp(m.poster, 100),
      percent: computeBlendedPercent(m.ratings, m.tmdbVoteAverage, m.tmdbVoteCount),
      role: person.role === 'ACTOR' ? characterBySlug.get(m.slug) || null : null,
      jobs: person.role === 'CREATOR' ? (creatorJob(person.name, m, jobKeys) || '').split(', ').filter(Boolean) : []
    }))
    .sort((a, b) => (b.percent ?? -1) - (a.percent ?? -1));
  const rated = ourMovies.filter((m) => m.percent !== null);

  const [news, collaborators, fanRows, mutualRows, mutualCount] = await Promise.all([
    movieIds.length
      ? prisma.newsPost.findMany({
          where: { movieId: { in: movieIds }, ...publishedNewsFilterForMember(opts.viewerIsMember) },
          orderBy: { createdAt: 'desc' },
          take: 6,
          select: { title: true, slug: true, coverImage: true, movie: { select: { title: true } } }
        })
      : Promise.resolve([] as { title: string; slug: string; coverImage: string | null; movie: { title: string } | null }[]),
    findFrequentCollaborators(person.name, movieIds, person.id, 6),
    prisma.personFollow.findMany({
      where: { personId: person.id, user: visibleFanFilter(viewerId) },
      orderBy: { createdAt: 'desc' },
      take: 9,
      select: { user: { select: { id: true, name: true, avatar: true } } }
    }),
    viewerId
      ? prisma.follow.findMany({
          where: { followerId: viewerId, following: { ...visibleFanFilter(viewerId), personFollows: { some: { personId: person.id } } } },
          take: 2,
          select: { following: { select: { name: true } } }
        })
      : Promise.resolve([] as { following: { name: string } }[]),
    viewerId ? prisma.follow.count({ where: { followerId: viewerId, following: { ...visibleFanFilter(viewerId), personFollows: { some: { personId: person.id } } } } }) : Promise.resolve(0)
  ]);

  return {
    movieCount: movies.length,
    filmographyCount: titles.length,
    careerSpan,
    avgPercent: rated.length ? Math.round(rated.reduce((n, m) => n + (m.percent || 0), 0) / rated.length) : null,
    knownFor: ourMovies.slice(0, 3),
    movies: ourMovies.slice(0, 30),
    career: careerStats(categories, movies, earliest),
    genres: genreShare(movies, 5),
    news: news.map((n) => ({ title: n.title, slug: n.slug, coverImage: sharp(n.coverImage, 300), movieTitle: n.movie?.title || '' })),
    collaborators: collaborators.map((c) => ({ id: c.id, name: c.name, slug: c.slug, photo: sharp(c.photo, 50), count: c.count })),
    fans: fanRows.map((f) => ({ id: f.user.id, name: f.user.name, avatar: sharp(f.user.avatar, 60) })),
    mutual: mutualCount ? { names: mutualRows.map((m) => m.following.name), total: mutualCount } : null,
    backdrop: sharp(rated[0]?.poster || null, 300)
  };
}
