import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { tmdbGetPremieresAndRating } from '@/lib/tmdb';

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Nemáš oprávnenie na túto akciu.' }, { status: 403 });
  }

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

  // Zámerne obmedzené len na filmy pridané za poslednú hodinu A bez akejkoľvek
  // už existujúcej premiéry — nech sa nedotkne staršieho obsahu ani filmov, kde
  // už niekto premiéry ručne upravil.
  const movies = await prisma.movie.findMany({
    where: {
      createdAt: { gte: oneHourAgo },
      tmdbId: { not: null },
      premiereDates: { none: {} }
    },
    select: { id: true, title: true, tmdbId: true, contentType: true, ageRating: true }
  });

  const results: { title: string; status: string; detail?: string }[] = [];

  for (const movie of movies) {
    try {
      const { premieres, ageRating } = await tmdbGetPremieresAndRating(
        movie.tmdbId!,
        movie.contentType === 'Seriál' ? 'tv' : 'movie'
      );

      if (premieres.length === 0) {
        results.push({ title: movie.title, status: 'BEZ DÁT', detail: 'TMDb nemá pre tento film žiadne sledované premiéry (ČR/USA)' });
        continue;
      }

      for (const p of premieres) {
        await prisma.moviePremiereDate.create({
          data: { movieId: movie.id, country: p.country, type: p.type, releaseDate: new Date(p.releaseDate) }
        });
      }

      if (ageRating && !movie.ageRating) {
        await prisma.movie.update({ where: { id: movie.id }, data: { ageRating } });
      }

      results.push({ title: movie.title, status: 'OK', detail: `Pridané premiéry: ${premieres.length}` });
    } catch (err: any) {
      results.push({ title: movie.title, status: 'CHYBA', detail: err.message });
    }
  }

  return NextResponse.json({ results, checked: movies.length });
}
