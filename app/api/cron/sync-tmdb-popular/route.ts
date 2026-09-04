import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { tmdbGetPopular, tmdbGetDetails } from '@/lib/tmdb';
import { slugify } from '@/lib/slugify';

export const maxDuration = 60;

export async function GET(req: Request) {
  // Vercel Cron posiela Authorization: Bearer <CRON_SECRET> — overíme, nech to
  // nemôže spustiť hocikto zvonka.
  const authHeader = req.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Neoprávnené.' }, { status: 401 });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const added: string[] = [];
  const skipped: string[] = [];

  const MAX_IMPORTS_PER_RUN = 3;

  for (const mediaType of ['movie', 'tv'] as const) {
    if (added.length >= MAX_IMPORTS_PER_RUN) break;
    // POZOR: bezplatný Vercel plán obmedzuje beh funkcie na 10 sekúnd bez ohľadu na
    // maxDuration nižšie — preto len 1 strana (20 titulov) na typ, nie viac.
    for (let page = 1; page <= 1; page++) {
      const items = await tmdbGetPopular(mediaType, page);

      for (const item of items) {
        if (added.length >= MAX_IMPORTS_PER_RUN) break;
        if (!item.releaseDate) continue;
        const releaseDate = new Date(item.releaseDate);
        if (releaseDate < today) continue; // zaujímajú nás len budúce/nadchádzajúce premiéry

        const existing = await prisma.movie.findFirst({ where: { tmdbId: item.tmdbId }, select: { id: true } });
        if (existing) continue;

        try {
          const details = await tmdbGetDetails(item.tmdbId, mediaType);
          const contentType = mediaType === 'tv' ? 'Seriál' : 'Film';

          let slug = slugify(details.title) || 'film';
          let uniqueSlug = slug;
          let counter = 2;
          while (await prisma.movie.findUnique({ where: { slug: uniqueSlug } })) {
            uniqueSlug = `${slug}-${counter}`;
            counter++;
          }

          const created = await prisma.movie.create({
            data: {
              title: details.title,
              originalTitle: details.originalTitle || null,
              slug: uniqueSlug,
              poster: details.poster || null,
              genres: details.genres || null,
              countries: details.countries || null,
              year: details.year || null,
              runtimeMinutes: details.runtimeMinutes || null,
              director: details.director || null,
              screenplay: details.screenplay || null,
              cinematography: details.cinematography || null,
              music: details.music || null,
              cast: details.cast || null,
              synopsis: details.synopsis || null,
              contentType,
              tmdbId: item.tmdbId,
              approved: true
            }
          });

          if (details.trailerUrl) {
            await prisma.movieVideo.create({
              data: { movieId: created.id, url: details.trailerUrl, category: 'trailer', title: details.trailerTitle || null }
            }).catch(() => {});
          }
          if (details.photoUrls?.length) {
            for (const photoUrl of details.photoUrls.slice(0, 8)) {
              await prisma.moviePhoto.create({
                data: { movieId: created.id, thumbnail: photoUrl, full: photoUrl }
              }).catch(() => {});
            }
          }

          added.push(`${details.title} (${mediaType})`);
        } catch (err: any) {
          skipped.push(`${item.tmdbId}: ${err.message || 'chyba'}`);
        }
      }
    }
  }

  return NextResponse.json({ ok: true, added, skippedCount: skipped.length, skipped });
}
