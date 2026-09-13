import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { tmdbGetEpisodeStillUrl } from '@/lib/tmdb';

export async function GET(_req: Request, { params }: { params: { seasonId: string; episodeId: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Nemáš oprávnenie na túto akciu.' }, { status: 403 });
  }

  const episode = await prisma.episode.findUnique({ where: { id: params.episodeId }, select: { number: true } });
  const season = await prisma.season.findUnique({ where: { id: params.seasonId }, select: { number: true, movie: { select: { tmdbId: true } } } });
  if (!episode || !season?.movie.tmdbId) {
    return NextResponse.json({ error: 'Táto epizóda nie je prepojená s TMDb.' }, { status: 400 });
  }

  const imageUrl = await tmdbGetEpisodeStillUrl(season.movie.tmdbId, season.number, episode.number);
  if (!imageUrl) {
    return NextResponse.json({ error: 'Na TMDb sa nenašiel žiadny vhodný obrázok pre túto epizódu.' }, { status: 404 });
  }

  return NextResponse.json({ imageUrl });
}
