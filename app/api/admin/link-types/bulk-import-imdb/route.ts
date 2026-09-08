import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { tmdbGetMovieExternalIds } from '@/lib/tmdb';

const BATCH_SIZE = 40; // rozumná dávka na jedno spustenie, nech to nenarazí na časový limit servera

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Nemáš oprávnenie na túto akciu.' }, { status: 403 });
  }

  // "IMDb" typ odkazu buď už existuje, alebo si ho pri prvom spustení sami vytvoríme.
  let imdbType = await prisma.movieLinkType.findUnique({ where: { name: 'IMDb' } });
  if (!imdbType) {
    const maxOrder = await prisma.movieLinkType.aggregate({ _max: { order: true } });
    imdbType = await prisma.movieLinkType.create({
      data: { name: 'IMDb', color: '#F5C518', order: (maxOrder._max.order ?? 0) + 1 }
    });
  }

  // Filmy s TMDb prepojením, čo ešte nemajú uložený IMDb odkaz.
  const candidates = await prisma.movie.findMany({
    where: {
      tmdbId: { not: null },
      links: { none: { linkTypeId: imdbType.id } }
    },
    select: { id: true, tmdbId: true, title: true },
    take: BATCH_SIZE
  });

  const remainingCount = await prisma.movie.count({
    where: { tmdbId: { not: null }, links: { none: { linkTypeId: imdbType.id } } }
  });

  let added = 0;
  let notFound = 0;

  for (const movie of candidates) {
    try {
      const { imdbUrl } = await tmdbGetMovieExternalIds(movie.tmdbId!);
      if (!imdbUrl) {
        notFound++;
        continue;
      }
      await prisma.movieLink.upsert({
        where: { movieId_linkTypeId: { movieId: movie.id, linkTypeId: imdbType.id } },
        update: { url: imdbUrl },
        create: { movieId: movie.id, linkTypeId: imdbType.id, url: imdbUrl }
      });
      added++;
    } catch (err) {
      console.error(`[bulk-import-imdb] Zlyhalo pri filme "${movie.title}":`, err);
      notFound++;
    }
  }

  return NextResponse.json({
    processed: candidates.length,
    added,
    notFound,
    remainingAfterThisBatch: Math.max(0, remainingCount - candidates.length)
  });
}
