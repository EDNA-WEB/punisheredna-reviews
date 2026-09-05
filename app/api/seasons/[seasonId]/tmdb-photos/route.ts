import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { tmdbGetSeasonImages } from '@/lib/tmdb';

export async function POST(_req: Request, { params }: { params: { seasonId: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Nemáš oprávnenie na túto akciu.' }, { status: 403 });
  }

  const season = await prisma.season.findUnique({ where: { id: params.seasonId }, select: { number: true, movieId: true, movie: { select: { tmdbId: true } } } });
  if (!season?.movie.tmdbId) {
    return NextResponse.json({ error: 'Táto séria nie je prepojená s TMDb.' }, { status: 400 });
  }

  const existingCount = await prisma.moviePhoto.count({ where: { seasonId: params.seasonId } });
  const urls = await tmdbGetSeasonImages(season.movie.tmdbId, season.number);
  if (urls.length === 0) {
    return NextResponse.json({ error: 'Na TMDb sa nenašli žiadne fotky pre túto sériu.' }, { status: 404 });
  }

  const photos = await prisma.$transaction(
    urls.map((url, i) =>
      prisma.moviePhoto.create({
        data: { movieId: season.movieId, seasonId: params.seasonId, thumbnail: url, full: url, order: existingCount + i }
      })
    )
  );

  return NextResponse.json(photos);
}
