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

  // Nájdeme presne tie záznamy, čo staré nástroje omylom vytvorili —
  // "CZ" premiéra s dátumom pred vznikom Českej republiky (1.1.1993).
  const badPremieres = await prisma.moviePremiereDate.findMany({
    where: { country: 'CZ', releaseDate: { lt: new Date('1993-01-01') } },
    include: { movie: { select: { title: true } } }
  });

  if (preview) {
    return NextResponse.json({
      count: badPremieres.length,
      sample: badPremieres.slice(0, 20).map((p) => `${p.movie.title} — ${p.releaseDate.toISOString().slice(0, 10)}`)
    });
  }

  const changes: LoggedChange[] = badPremieres.map((p) => ({
    targetType: 'premiere',
    targetId: p.id,
    movieTitle: p.movie.title,
    field: '__deleted__',
    // Uložíme celý pôvodný záznam, nech ho vieme pri vrátení späť znova vytvoriť.
    oldValue: JSON.stringify({ movieId: p.movieId, country: p.country, type: p.type, releaseDate: p.releaseDate, distributor: p.distributor }),
    newValue: null,
    wasCreated: false
  }));

  await prisma.moviePremiereDate.deleteMany({ where: { id: { in: badPremieres.map((p) => p.id) } } });

  const batchId = await logBulkImportBatch('cleanup-cz-anachronistic', changes);
  return NextResponse.json({ deleted: badPremieres.length, batchId });
}
