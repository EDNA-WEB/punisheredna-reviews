import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { tmdbGetSeasonEpisodes } from '@/lib/tmdb';

export async function POST(_req: Request, { params }: { params: { seasonId: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Nemáš oprávnenie na túto akciu.' }, { status: 403 });
  }

  const season = await prisma.season.findUnique({
    where: { id: params.seasonId },
    select: { number: true, movie: { select: { tmdbId: true } }, episodes: { select: { id: true, number: true } } }
  });
  if (!season?.movie.tmdbId) {
    return NextResponse.json({ error: 'Táto séria nie je prepojená s TMDb.' }, { status: 400 });
  }

  const tmdbEpisodes = await tmdbGetSeasonEpisodes(season.movie.tmdbId, season.number);
  const byNumber = new Map(tmdbEpisodes.map((e) => [e.number, e]));

  let updated = 0;
  for (const ep of season.episodes) {
    const match = byNumber.get(ep.number);
    if (match?.airDate) {
      await prisma.episode.update({ where: { id: ep.id }, data: { releaseDate: new Date(match.airDate) } });
      updated++;
    }
  }

  const seasonAirDate = tmdbEpisodes[0]?.airDate;
  if (seasonAirDate) {
    await prisma.season.update({ where: { id: params.seasonId }, data: { releaseDate: new Date(seasonAirDate) } });
  }

  return NextResponse.json({ updated });
}
