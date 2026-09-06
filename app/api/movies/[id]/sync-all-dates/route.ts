import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { tmdbGetSeasonEpisodes } from '@/lib/tmdb';

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Nemáš oprávnenie na túto akciu.' }, { status: 403 });
  }

  const movie = await prisma.movie.findUnique({ where: { id: params.id }, select: { tmdbId: true } });
  if (!movie?.tmdbId) {
    return NextResponse.json({ error: 'Tento seriál nie je prepojený s TMDb.' }, { status: 400 });
  }

  const seasons = await prisma.season.findMany({
    where: { movieId: params.id },
    select: { id: true, number: true, episodes: { select: { id: true, number: true } } }
  });

  let updatedEpisodes = 0;
  let updatedSeasons = 0;

  // Séria po sérii, nie naraz — TMDb má rozumný limit na počet dopytov za sekundu
  // a chceme sa mu radšej vyhnúť, než aby import zlyhal pri veľkých seriáloch.
  for (const season of seasons) {
    const tmdbEpisodes = await tmdbGetSeasonEpisodes(movie.tmdbId, season.number);
    const byNumber = new Map(tmdbEpisodes.map((e) => [e.number, e]));

    for (const ep of season.episodes) {
      const match = byNumber.get(ep.number);
      if (match?.airDate) {
        await prisma.episode.update({ where: { id: ep.id }, data: { releaseDate: new Date(match.airDate) } });
        updatedEpisodes++;
      }
    }

    const seasonAirDate = tmdbEpisodes[0]?.airDate;
    if (seasonAirDate) {
      await prisma.season.update({ where: { id: season.id }, data: { releaseDate: new Date(seasonAirDate) } });
      updatedSeasons++;
    }
  }

  return NextResponse.json({ updatedSeasons, updatedEpisodes });
}
