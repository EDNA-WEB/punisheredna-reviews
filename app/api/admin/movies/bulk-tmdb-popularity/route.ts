import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { tmdbGetMoviePopularity } from '@/lib/tmdb';

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Nemáš oprávnenie na túto akciu.' }, { status: 403 });
  }

  // Len filmy prepojené s TMDb — bez tmdbId nemáme odkiaľ popularitu natiahnuť.
  const movies = await prisma.movie.findMany({
    where: { approved: true, tmdbId: { not: null } },
    select: { id: true, tmdbId: true, contentType: true }
  });

  let updated = 0;
  let failed = 0;

  for (const movie of movies) {
    try {
      const mediaType = movie.contentType === 'Seriál' ? 'tv' : 'movie';
      const { popularity, voteAverage, voteCount } = await tmdbGetMoviePopularity(movie.tmdbId!, mediaType);
      if (popularity !== null || voteAverage !== null) {
        await prisma.movie.update({
          where: { id: movie.id },
          data: { tmdbPopularity: popularity, tmdbVoteAverage: voteAverage, tmdbVoteCount: voteCount }
        });
        updated++;
      } else {
        failed++;
      }
    } catch {
      failed++;
    }
  }

  return NextResponse.json({ ok: true, total: movies.length, updated, failed });
}
