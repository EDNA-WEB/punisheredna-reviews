import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { computePercent } from '@/lib/rating';
import { checkIpRateLimit } from '@/lib/ipRateLimit';

export async function GET(req: Request) {
  if (!checkIpRateLimit(req, 'search-movies', 10_000, 20)) {
    return NextResponse.json({ error: 'Príliš veľa vyhľadávaní za krátky čas.' }, { status: 429 });
  }

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get('q') || '').trim();

  if (!q || q.length < 2) {
    return NextResponse.json({ movies: [], users: [], episodes: [] });
  }

  const [movies, users, episodes] = await Promise.all([
    prisma.movie.findMany({
      where: {
        approved: true,
        OR: [{ title: { contains: q, mode: 'insensitive' } }, { originalTitle: { contains: q, mode: 'insensitive' } }]
      },
      orderBy: { createdAt: 'desc' },
      take: 8,
      include: { ratings: { where: { seasonId: null, episodeId: null } } }
    }),
    prisma.user.findMany({
      where: { name: { contains: q, mode: 'insensitive' }, banned: false, deleted: false },
      orderBy: { name: 'asc' },
      take: 5,
      select: { id: true, name: true, avatar: true, role: true, membershipUntil: true }
    }),
    prisma.episode.findMany({
      where: { title: { contains: q, mode: 'insensitive' }, season: { movie: { approved: true } } },
      take: 5,
      select: {
        id: true,
        number: true,
        title: true,
        season: { select: { number: true, movie: { select: { title: true, slug: true, poster: true } } } }
      }
    })
  ]);

  const episodeResults = episodes.map((e) => ({
    id: e.id,
    title: e.title,
    number: e.number,
    seasonNumber: e.season.number,
    movieTitle: e.season.movie.title,
    movieSlug: e.season.movie.slug,
    poster: e.season.movie.poster
  }));

  const movieResults = movies.map((m) => ({
    id: m.id,
    title: m.title,
    slug: m.slug,
    year: m.year,
    poster: m.poster,
    percent: computePercent(m.ratings),
    ratingCount: m.ratings.length
  }));

  return NextResponse.json({ movies: movieResults, users, episodes: episodeResults });
}
