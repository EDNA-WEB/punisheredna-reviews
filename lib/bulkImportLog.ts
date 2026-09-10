import { prisma } from './prisma';
import { randomUUID } from 'crypto';

export type LoggedChange = {
  targetType: 'movie' | 'episode' | 'premiere' | 'movieLink' | 'streamingService';
  targetId: string;
  movieTitle: string;
  field: string;
  oldValue: string | null;
  newValue: string | null;
  wasCreated?: boolean;
};

// Vytvorí nový "batch" (dávku) a zaznamená doňho všetky zmeny, čo hromadný
// import naozaj vykonal — vďaka tomu vieme dávku neskôr jedným klikom vrátiť
// späť na pôvodné hodnoty.
export async function logBulkImportBatch(importType: string, changes: LoggedChange[]): Promise<string> {
  const batchId = randomUUID();
  if (changes.length === 0) return batchId;

  await prisma.bulkImportChange.createMany({
    data: changes.map((c) => ({
      batchId,
      importType,
      targetType: c.targetType,
      targetId: c.targetId,
      movieTitle: c.movieTitle,
      field: c.field,
      oldValue: c.oldValue,
      newValue: c.newValue,
      wasCreated: c.wasCreated || false
    }))
  });

  return batchId;
}

const BOOLEAN_FIELDS = new Set(['hasSubtitles', 'hasDubbing']);

function coerceValue(field: string, value: string | null): any {
  if (BOOLEAN_FIELDS.has(field)) return value === 'true';
  return value;
}

// Vráti celú dávku zmien späť na pôvodné hodnoty. Ak riadok vznikol novo
// (wasCreated), pri vrátení sa rovno vymaže namiesto nastavenia na null.
export async function undoBulkImportBatch(batchId: string): Promise<{ reverted: number; errors: string[] }> {
  const changes = await prisma.bulkImportChange.findMany({ where: { batchId, undone: false } });
  const errors: string[] = [];
  let reverted = 0;

  for (const change of changes) {
    try {
      if (change.targetType === 'movie') {
        await prisma.movie.update({
          where: { id: change.targetId },
          data: { [change.field]: coerceValue(change.field, change.oldValue) }
        });
      } else if (change.targetType === 'episode') {
        await prisma.episode.update({
          where: { id: change.targetId },
          data: { [change.field]: change.oldValue }
        });
      } else if (change.targetType === 'premiere') {
        if (change.wasCreated) {
          await prisma.moviePremiereDate.delete({ where: { id: change.targetId } }).catch(() => {});
        } else {
          await prisma.moviePremiereDate.update({
            where: { id: change.targetId },
            data: { [change.field]: change.oldValue }
          });
        }
      } else if (change.targetType === 'movieLink') {
        if (change.wasCreated) {
          await prisma.movieLink.delete({ where: { id: change.targetId } }).catch(() => {});
        } else {
          await prisma.movieLink.update({ where: { id: change.targetId }, data: { url: change.oldValue || '' } });
        }
      } else if (change.targetType === 'streamingService') {
        if (change.wasCreated) {
          await prisma.movieStreamingService.delete({ where: { id: change.targetId } }).catch(() => {});
        } else {
          await prisma.movieStreamingService.update({ where: { id: change.targetId }, data: { url: change.oldValue || '' } });
        }
      }
      reverted++;
    } catch (err: any) {
      errors.push(`${change.movieTitle} (${change.field}): ${err.message}`);
    }
  }

  await prisma.bulkImportChange.updateMany({ where: { batchId }, data: { undone: true } });

  return { reverted, errors };
}
