import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { tmdbGetMovieExternalIds } from '@/lib/tmdb';
import { logBulkAction } from '@/lib/auditLog';

const BATCH_SIZE = 40; // rozumná dávka na jedno spustenie, nech to nenarazí na časový limit servera

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Nemáš oprávnenie na túto akciu.' }, { status: 403 });
  }

  // Filmy, čo sme už v tomto behu vyskúšali (aj neúspešne) — bez tohto by sa
  // filmy bez dostupného IMDb odkazu na TMDb vracali v KAŽDOM ďalšom kole
  // znova a znova (nikdy nedostanú odkaz, takže stále "spĺňajú" podmienku
  // "ešte nemá odkaz"), a slučka na klientovi by sa nikdy neposunula ďalej.
  const body = await req.json().catch(() => ({}));
  const excludeIds: string[] = Array.isArray(body?.excludeIds) ? body.excludeIds : [];

  // "IMDb" typ odkazu buď už existuje, alebo si ho pri prvom spustení sami vytvoríme.
  let imdbType = await prisma.movieLinkType.findUnique({ where: { name: 'IMDb' } });
  if (!imdbType) {
    const maxOrder = await prisma.movieLinkType.aggregate({ _max: { order: true } });
    imdbType = await prisma.movieLinkType.create({
      data: { name: 'IMDb', color: '#F5C518', order: (maxOrder._max.order ?? 0) + 1 }
    });
  }

  const baseWhere = {
    tmdbId: { not: null },
    links: { none: { linkTypeId: imdbType.id } },
    ...(excludeIds.length > 0 ? { id: { notIn: excludeIds } } : {})
  };

  // Filmy s TMDb prepojením, čo ešte nemajú uložený IMDb odkaz (a neboli
  // vyskúšané už v tomto behu).
  const candidates = await prisma.movie.findMany({
    where: baseWhere,
    select: { id: true, tmdbId: true, title: true, contentType: true },
    take: BATCH_SIZE
  });

  const remainingCount = await prisma.movie.count({ where: baseWhere });

  let added = 0;
  let notFound = 0;
  const attemptedIds: string[] = [];

  for (const movie of candidates) {
    attemptedIds.push(movie.id);
    try {
      // Seriály majú v TMDb úplne inú číselnú databázu ID než filmy — bez
      // tohto rozlíšenia by sa dopyt na seriál pýtal na neexistujúci/nesprávny film.
      const mediaType = movie.contentType === 'Seriál' ? 'tv' : 'movie';
      const { imdbUrl } = await tmdbGetMovieExternalIds(movie.tmdbId!, mediaType);
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

  await logBulkAction({
    userId: (session.user as any).id,
    userName: (session.user as any).name || 'neznámy',
    toolName: 'Hromadný import IMDb odkazov',
    updated: added,
    failed: notFound,
    total: candidates.length
  });

  return NextResponse.json({
    processed: candidates.length,
    added,
    notFound,
    attemptedIds,
    remainingAfterThisBatch: Math.max(0, remainingCount - candidates.length)
  });
}
