import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { tmdbGetEpisodeStills } from '@/lib/tmdb';

export async function POST(_req: Request, { params }: { params: { seasonId: string; episodeId: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Nemáš oprávnenie na túto akciu.' }, { status: 403 });
  }

  const episode = await prisma.episode.findUnique({ where: { id: params.episodeId }, select: { number: true } });
  const season = await prisma.season.findUnique({ where: { id: params.seasonId }, select: { number: true, movieId: true, movie: { select: { tmdbId: true } } } });
  if (!episode || !season?.movie.tmdbId) {
    return NextResponse.json({ error: 'Táto epizóda nie je prepojená s TMDb.' }, { status: 400 });
  }

  const existingCount = await prisma.moviePhoto.count({ where: { episodeId: params.episodeId } });
  const stillUrls = await tmdbGetEpisodeStills(season.movie.tmdbId, season.number, episode.number);
  if (stillUrls.length === 0) {
    return NextResponse.json({ error: 'Na TMDb sa nenašli žiadne fotky pre túto epizódu.' }, { status: 404 });
  }

  const photos = await prisma.$transaction(
    stillUrls.map((url, i) =>
      prisma.moviePhoto.create({
        data: { movieId: season.movieId, episodeId: params.episodeId, thumbnail: url, full: url, order: existingCount + i }
      })
    )
  );

  return NextResponse.json(photos);
}
