import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { tmdbGetPremieresAndRating } from '@/lib/tmdb';
import { logBulkImportBatch, LoggedChange } from '@/lib/bulkImportLog';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Nemáš oprávnenie na túto akciu.' }, { status: 403 });
  }

  const { movieIds, includeVod, preview } = await req.json();
  if (!Array.isArray(movieIds) || movieIds.length === 0) {
    return NextResponse.json({ error: 'Nevybral si žiadny film.' }, { status: 400 });
  }

  const movies = await prisma.movie.findMany({
    where: { id: { in: movieIds } },
    select: { id: true, title: true, tmdbId: true, contentType: true, ageRating: true, premiereDates: true }
  });

  if (preview) {
    return NextResponse.json({ count: movies.length, sample: movies.slice(0, 20).map((m) => m.title) });
  }

  const results: { title: string; status: string; detail?: string }[] = [];
  const changes: LoggedChange[] = [];

  for (const movie of movies) {
    if (!movie.tmdbId) {
      results.push({ title: movie.title, status: 'CHYBA', detail: 'Film nie je prepojený s TMDb' });
      continue;
    }
    try {
      const { premieres, ageRating } = await tmdbGetPremieresAndRating(
        movie.tmdbId,
        movie.contentType === 'Seriál' ? 'tv' : 'movie'
      );

      // Rovnaká oprava ako pri hromadných nástrojoch: len najskoršia premiéra
      // na krajinu/typ a žiadna anachronická "CZ" premiéra spred vzniku ČR (1993).
      const earliestByKey = new Map<string, { country: string; type: string; releaseDate: string }>();
      for (const p of premieres) {
        if (!includeVod && p.type === 'VOD') continue;
        if (p.country === 'CZ' && p.releaseDate < '1993-01-01') continue;
        const key = `${p.country}:${p.type}`;
        const existing = earliestByKey.get(key);
        if (!existing || p.releaseDate < existing.releaseDate) earliestByKey.set(key, p);
      }
      const filteredPremieres = Array.from(earliestByKey.values());

      // Existujúce premiéry filmu najprv zalogujeme (aby sme ich pri "vrátiť
      // späť" vedeli obnoviť) a zmažeme — táto akcia teda NAHRÁDZA staré,
      // prípadne chybné dáta novými, správne prefiltrovanými.
      for (const old of movie.premiereDates) {
        changes.push({
          targetType: 'premiere',
          targetId: old.id,
          movieTitle: movie.title,
          field: '__deleted__',
          oldValue: JSON.stringify({ movieId: old.movieId, country: old.country, type: old.type, releaseDate: old.releaseDate, distributor: old.distributor }),
          newValue: null,
          wasCreated: false
        });
      }
      await prisma.moviePremiereDate.deleteMany({ where: { movieId: movie.id } });

      if (filteredPremieres.length === 0) {
        results.push({ title: movie.title, status: 'BEZ DÁT', detail: 'TMDb nemá pre tento film žiadnu vyhovujúcu premiéru — pôvodné dáta boli zmazané' });
        continue;
      }

      for (const p of filteredPremieres) {
        const created = await prisma.moviePremiereDate.create({
          data: { movieId: movie.id, country: p.country, type: p.type, releaseDate: new Date(p.releaseDate) }
        });
        changes.push({
          targetType: 'premiere',
          targetId: created.id,
          movieTitle: movie.title,
          field: '__created__',
          oldValue: null,
          newValue: p.releaseDate,
          wasCreated: true
        });
      }

      if (ageRating && !movie.ageRating) {
        await prisma.movie.update({ where: { id: movie.id }, data: { ageRating } });
      }

      results.push({
        title: movie.title,
        status: 'OK',
        detail: filteredPremieres.map((p) => `${p.country} (${p.type}): ${p.releaseDate}`).join(', ')
      });
    } catch (err: any) {
      results.push({ title: movie.title, status: 'CHYBA', detail: err.message });
    }
  }

  const batchId = await logBulkImportBatch('premieres-selected-refresh', changes);
  return NextResponse.json({ results, batchId, checked: movies.length });
}
