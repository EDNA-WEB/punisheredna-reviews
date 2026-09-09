import { prisma } from '@/lib/prisma'; // uprav podľa skutočnej cesty k vašej Prisma inštancii
import { ImportItem, ImportRowResult } from './types';

/**
 * DÔLEŽITÉ — prispôsobte tento súbor svojej schéme:
 *
 * 1. `prisma.movie` — ak sa váš model volá inak (napr. Film), premenujte všade nižšie.
 * 2. `prisma.whereToWatch` — očakáva model s poľami (movieId, platform, url).
 *    Tento import STRATÉGIU "nahradiť": pri každom importe zmaže existujúce záznamy
 *    daného filmu a vytvorí nové z importného súboru. Ak chcete namiesto toho
 *    dopĺňať/aktualizovať jednotlivé platformy bez mazania ostatných, treba
 *    upsert podľa unikátneho kľúča (movieId + platform) — vyžaduje
 *    `@@unique([movieId, platform])` vo vašej schéme.
 * 3. `prisma.tag` — očakáva model s unikátnym poľom `name` a many-to-many
 *    reláciou `tags` na Movie.
 * 4. `prisma.release` (premiéry) — očakáva model s poľami
 *    (movieId, type, date, country?, distributor?) a unikátnym párom
 *    (movieId, type), t.j. `@@unique([movieId, type])`. Bez tohto unique
 *    kľúča upsert nebude fungovať — dajte vedieť a prerobím na
 *    "zmazať + vytvoriť nanovo" tak ako pri whereToWatch.
 */

export async function processImportItems(items: ImportItem[]): Promise<ImportRowResult[]> {
  const results: ImportRowResult[] = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const rowNumber = i + 2; // +2 = riadok v CSV vrátane hlavičky; pri JSON to berte len ako poradie

    if (!item?.title || !item?.year) {
      results.push({
        row: rowNumber,
        title: item?.title ?? '(chýba názov)',
        year: item?.year ?? null,
        status: 'error',
        message: 'Chýba title alebo year.'
      });
      continue;
    }

    try {
      const movie = await prisma.movie.findFirst({
        where: {
          year: item.year,
          title: { equals: item.title, mode: 'insensitive' }
        }
      });

      if (!movie) {
        results.push({
          row: rowNumber,
          title: item.title,
          year: item.year,
          status: 'not_found',
          message: 'Film s týmto názvom a rokom sa v databáze nenašiel — import ho nevytvára, len aktualizuje existujúce záznamy.'
        });
        continue;
      }

      await prisma.$transaction(async (tx) => {
        // --- Kde sledovať: nahradí celý zoznam platforiem novým zo súboru ---
        if (item.whereToWatch) {
          await tx.whereToWatch.deleteMany({ where: { movieId: movie.id } });
          if (item.whereToWatch.length > 0) {
            await tx.whereToWatch.createMany({
              data: item.whereToWatch.map((w) => ({
                movieId: movie.id,
                platform: w.platform,
                url: w.url
              }))
            });
          }
        }

        // --- Tagy: vytvorí chýbajúce a nastaví film presne na zoznam zo súboru ---
        if (item.tags) {
          const tagIds: string[] = [];
          for (const name of item.tags) {
            const tag = await tx.tag.upsert({
              where: { name },
              create: { name },
              update: {}
            });
            tagIds.push(tag.id);
          }
          await tx.movie.update({
            where: { id: movie.id },
            data: { tags: { set: tagIds.map((id) => ({ id })) } }
          });
        }

        // --- Premiéry: upsert podľa (movieId, type) ---
        if (item.premieres) {
          for (const p of item.premieres) {
            await tx.release.upsert({
              where: {
                movieId_type: { movieId: movie.id, type: p.type as any }
              },
              create: {
                movieId: movie.id,
                type: p.type as any,
                date: new Date(p.date),
                country: p.country,
                distributor: p.distributor
              },
              update: {
                date: new Date(p.date),
                country: p.country,
                distributor: p.distributor
              }
            });
          }
        }
      });

      results.push({ row: rowNumber, title: item.title, year: item.year, status: 'updated' });
    } catch (err: any) {
      results.push({
        row: rowNumber,
        title: item.title,
        year: item.year,
        status: 'error',
        message: err?.message ?? 'Neznáma chyba.'
      });
    }
  }

  return results;
}
