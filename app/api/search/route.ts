import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCachedSearchIndex } from '@/lib/cachedMovieData';
import { computeBlendedPercent } from '@/lib/rating';
import { checkIpRateLimit } from '@/lib/ipRateLimit';
import { normalize, matchScore } from '@/lib/fuzzySearch';

export async function GET(req: Request) {
  if (!checkIpRateLimit(req, 'search-movies', 10_000, 20)) {
    return NextResponse.json({ error: 'Príliš veľa vyhľadávaní za krátky čas.' }, { status: 429 });
  }

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get('q') || '').trim();

  if (!q || q.length < 2) {
    return NextResponse.json({ movies: [], users: [], episodes: [] });
  }

  const normalizedQuery = normalize(q);
  const queryWords = normalizedQuery.split(/\s+/).filter(Boolean);

  const [searchIndex, users, episodes] = await Promise.all([
    getCachedSearchIndex(),
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

  // Skórovanie prebieha nad ĽAHKÝM zoznamom (len id + názvy) v pamäti — tu sa
  // rieši aj tolerancia na preklepy. Až pre TOP 8 zhôd sa potom dotiahnu plné
  // detaily (poster, hodnotenia) samostatným, cieleným dopytom.
  const scored = searchIndex
    .map((m) => {
      const titleScore = matchScore(m.title, normalizedQuery, queryWords);
      const originalScore = m.originalTitle ? matchScore(m.originalTitle, normalizedQuery, queryWords) : 0;
      return { id: m.id, score: Math.max(titleScore, originalScore) };
    })
    .filter((m) => m.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);

  if (scored.length === 0) {
    return NextResponse.json({ movies: [], users, episodes: episodeResults });
  }

  const scoreById = new Map(scored.map((s) => [s.id, s.score]));
  const fullMovies = await prisma.movie.findMany({
    where: { id: { in: scored.map((s) => s.id) } },
    include: { ratings: { where: { seasonId: null, episodeId: null } } }
  });

  // "findMany" s "in" nezaručuje poradie výsledkov podľa vstupného poľa —
  // zoradíme preto ešte raz podľa skóre (a pri zhode podľa počtu hodnotení).
  const movieResults = fullMovies
    .map((m) => ({
      id: m.id,
      title: m.title,
      slug: m.slug,
      year: m.year,
      poster: m.poster,
      percent: computeBlendedPercent(m.ratings, m.tmdbVoteAverage, m.tmdbVoteCount),
      ratingCount: m.ratings.length,
      score: scoreById.get(m.id) || 0
    }))
    .sort((a, b) => b.score - a.score || b.ratingCount - a.ratingCount)
    .map(({ score, ...rest }) => rest);

  return NextResponse.json({ movies: movieResults, users, episodes: episodeResults });
}
