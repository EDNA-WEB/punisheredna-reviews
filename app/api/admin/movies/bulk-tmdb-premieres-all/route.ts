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

  const { includeVod, preview } = await req.json().catch(() => ({ includeVod: false, preview: false }));

  // Len filmy bez akejkoľvek existujúcej premiéry — nedotkne sa filmov, kde
  // už niekto premiéry ručne upravil alebo pridal skôr.
  const movies = await prisma.movie.findMany({
    where: { approved: true, tmdbId: { not: null }, premiereDates: { none: {} } },
    select: { id: true, title: true, tmdbId: true, contentType: true, ageRating: true }
  });

  if (preview) {
    return NextResponse.json({ count: movies.length, sample: movies.slice(0, 20).map((m) => m.title) });
  }

  const results: { title: string; status: string; detail?: string }[] = [];
  const changes: LoggedChange[] = [];

  for (const movie of movies) {
    try {
      const { premieres, ageRating } = await tmdbGetPremieresAndRating(
        movie.tmdbId!,
        movie.contentType === 'Seriál' ? 'tv' : 'movie'
      );

      // Z každej dvojice (krajina, typ) vezmeme len NAJSKORŠÍ dátum — nech sa
      // nepridávajú opakované/neskoršie uvedenia toho istého filmu. Ak nechce
      // VOD, typ VOD úplne vynecháme, žiadny náhradný fallback naň.
      const earliestByKey = new Map<string, { country: string; type: string; releaseDate: string }>();
      let skippedAnachronisticCz = false;
      for (const p of premieres) {
        if (!includeVod && p.type === 'VOD') continue;

        // Česká republika vznikla až 1.1.1993 (rozdelením Československa) —
        // "CZ" premiéra pri filme uvedenom skôr je historicky nepresná (v
        // skutočnosti šlo o Československo, nie o dnešnú ČR), preto ju
        // automaticky nepridávame a necháme na ručné posúdenie.
        if (p.country === 'CZ' && p.releaseDate < '1993-01-01') {
          skippedAnachronisticCz = true;
          continue;
        }

        const key = `${p.country}:${p.type}`;
        const existing = earliestByKey.get(key);
        if (!existing || p.releaseDate < existing.releaseDate) earliestByKey.set(key, p);
      }
      const filteredPremieres = Array.from(earliestByKey.values());

      if (filteredPremieres.length === 0) {
        results.push({
          title: movie.title,
          status: 'BEZ DÁT',
          detail: skippedAnachronisticCz
            ? 'TMDb má len CZ premiéru spred vzniku ČR (pred rokom 1993) — nepridané, over ručne'
            : 'TMDb nemá pre tento film žiadnu vyhovujúcu premiéru'
        });
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

  const batchId = await logBulkImportBatch('tmdb-premieres-all', changes);
  return NextResponse.json({ results, batchId, checked: movies.length });
}
