import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { tmdbGetPremieresAndRating } from '@/lib/tmdb';

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { params } = { ...ctx, params: await ctx.params };
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Nemáš oprávnění k této akci.' }, { status: 403 });
  }

  const movie = await prisma.movie.findUnique({ where: { id: params.id }, select: { tmdbId: true, contentType: true } });
  if (!movie?.tmdbId) {
    return NextResponse.json({ error: 'Tento film/seriál není propojený s TMDb.' }, { status: 400 });
  }

  const result = await tmdbGetPremieresAndRating(movie.tmdbId, movie.contentType === 'Seriál' ? 'tv' : 'movie');
  if (result.premieres.length === 0) {
    return NextResponse.json({ error: 'Na TMDb se nenašly žádné premiéry pro sledované země.' }, { status: 404 });
  }

  return NextResponse.json(result);
}
