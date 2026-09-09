import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logBulkImportBatch, LoggedChange } from '@/lib/bulkImportLog';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Nemáš oprávnenie na túto akciu.' }, { status: 403 });
  }

  const { preview } = await req.json().catch(() => ({ preview: false }));

  const movies = await prisma.movie.findMany({
    where: { approved: true },
    select: { id: true, title: true, year: true, hasSubtitles: true, hasDubbing: true }
  });

  // Rok je textové pole (napr. aj rozsah "2011–2019" pri seriáloch) — berieme
  // len prvé 4 číslice ako počiatočný rok.
  const target = movies.filter((m) => {
    const startYear = parseInt((m.year || '').slice(0, 4), 10);
    return !Number.isNaN(startYear) && startYear < 2025 && !(m.hasSubtitles && m.hasDubbing);
  });

  if (preview) {
    return NextResponse.json({
      count: target.length,
      sample: target.slice(0, 20).map((m) => `${m.title} (${m.year})`)
    });
  }

  const changes: LoggedChange[] = [];
  for (const m of target) {
    if (!m.hasDubbing) {
      changes.push({ targetType: 'movie', targetId: m.id, movieTitle: m.title, field: 'hasDubbing', oldValue: 'false', newValue: 'true' });
    }
    if (!m.hasSubtitles) {
      changes.push({ targetType: 'movie', targetId: m.id, movieTitle: m.title, field: 'hasSubtitles', oldValue: 'false', newValue: 'true' });
    }
    await prisma.movie.update({ where: { id: m.id }, data: { hasSubtitles: true, hasDubbing: true } });
  }

  const batchId = await logBulkImportBatch('localization-pre2025', changes);
  return NextResponse.json({ count: target.length, batchId });
}
