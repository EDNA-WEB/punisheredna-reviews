import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { tmdbGetBackdropUrl } from '@/lib/tmdb';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Nemáš oprávnenie na túto akciu.' }, { status: 403 });
  }

  const movie = await prisma.movie.findUnique({ where: { id: params.id }, select: { tmdbId: true, contentType: true } });
  if (!movie?.tmdbId) {
    return NextResponse.json({ error: 'Tento film/seriál nie je prepojený s TMDb.' }, { status: 400 });
  }

  const imageUrl = await tmdbGetBackdropUrl(movie.tmdbId, movie.contentType === 'Seriál' ? 'tv' : 'movie');
  if (!imageUrl) {
    return NextResponse.json({ error: 'Na TMDb sa nenašiel žiadny vhodný obrázok.' }, { status: 404 });
  }

  return NextResponse.json({ imageUrl });
}
