import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Tento endpoint prijíma dáta PRESNE v tvare, aký vracia oficiálne TMDb API
// (watch/providers, release_dates, keywords) — nie ľubovoľný JSON. Každá
// položka musí mať tmdb_id, nech vieme film jednoznačne napárovať.
//
// Očakávaný formát vstupu (pole položiek, jedna na film):
// [
//   {
//     "tmdb_id": 550,
//     "watch_providers": { "CZ": { "link": "...", "flatrate": [...], "rent": [...], "buy": [...] } },
//     "release_dates": [ { "iso_3166_1": "CZ", "release_dates": [ { "type": 3, "release_date": "..." } ] } ],
//     "keywords": [ { "id": 1, "name": "..." } ]
//   }
// ]

const RELEASE_TYPE_TO_PREMIERE_TYPE: Record<number, string> = {
  2: 'KINO', // Theatrical (limited)
  3: 'KINO', // Theatrical
  4: 'VOD', // Digital
  5: 'VOD' // Physical — najbližšie k VOD kategórii v našom systéme
};

const PREFERRED_REGIONS = ['CZ', 'SK', 'US'];

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Nemáš oprávnenie na túto akciu.' }, { status: 403 });
  }

  let items: any[];
  try {
    const body = await req.json();
    items = Array.isArray(body) ? body : [body];
  } catch {
    return NextResponse.json({ error: 'Neplatný JSON súbor.' }, { status: 400 });
  }

  const results: { tmdbId: number; status: string; detail?: string }[] = [];

  for (const item of items) {
    const tmdbId = item?.tmdb_id;
    if (!tmdbId || typeof tmdbId !== 'number') {
      results.push({ tmdbId: tmdbId ?? -1, status: 'CHYBA', detail: 'Chýba alebo neplatné tmdb_id' });
      continue;
    }

    const movie = await prisma.movie.findFirst({ where: { tmdbId }, select: { id: true } });
    if (!movie) {
      results.push({ tmdbId, status: 'NENÁJDENÉ', detail: 'Žiadny film s týmto tmdb_id v databáze' });
      continue;
    }

    try {
      // --- Watch providers ---
      if (item.watch_providers && typeof item.watch_providers === 'object') {
        const region = PREFERRED_REGIONS.find((r) => item.watch_providers[r]) || Object.keys(item.watch_providers)[0];
        const regionData = region ? item.watch_providers[region] : null;
        if (regionData) {
          const allProviders = [...(regionData.flatrate || []), ...(regionData.rent || []), ...(regionData.buy || [])];
          const seenNames = new Set<string>();
          for (const p of allProviders) {
            if (!p?.provider_name || seenNames.has(p.provider_name)) continue;
            seenNames.add(p.provider_name);

            const service = await prisma.streamingService.upsert({
              where: { name: p.provider_name },
              update: {},
              create: { name: p.provider_name }
            });

            // TMDb neposkytuje priamy hlboký odkaz na konkrétny film v danej
            // službe — len všeobecnú TMDb "watch" stránku (JustWatch partner).
            await prisma.movieStreamingService.upsert({
              where: { movieId_streamingServiceId: { movieId: movie.id, streamingServiceId: service.id } },
              update: { url: regionData.link || '' },
              create: { movieId: movie.id, streamingServiceId: service.id, url: regionData.link || '' }
            });
          }
        }
      }

      // --- Release dates ---
      if (Array.isArray(item.release_dates)) {
        for (const countryEntry of item.release_dates) {
          const country = countryEntry?.iso_3166_1;
          if (!country || !Array.isArray(countryEntry.release_dates)) continue;
          for (const rd of countryEntry.release_dates) {
            const premiereType = RELEASE_TYPE_TO_PREMIERE_TYPE[rd.type];
            if (!premiereType || !rd.release_date) continue;
            const releaseDate = new Date(rd.release_date);
            if (Number.isNaN(releaseDate.getTime())) continue;

            const existing = await prisma.moviePremiereDate.findFirst({
              where: { movieId: movie.id, country, type: premiereType, releaseDate }
            });
            if (!existing) {
              await prisma.moviePremiereDate.create({
                data: { movieId: movie.id, country, type: premiereType, releaseDate }
              });
            }
          }
        }
      }

      // --- Keywords ---
      if (Array.isArray(item.keywords)) {
        for (const kw of item.keywords) {
          if (!kw?.name) continue;
          await prisma.movieKeyword.upsert({
            where: { movieId_name: { movieId: movie.id, name: kw.name } },
            update: {},
            create: { movieId: movie.id, name: kw.name }
          });
        }
      }

      results.push({ tmdbId, status: 'OK' });
    } catch (err: any) {
      results.push({ tmdbId, status: 'CHYBA', detail: err.message });
    }
  }

  return NextResponse.json({ results });
}
