import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// Rovnaká logika ako komponenta PremieresList na webe — len nadchádzajúce
// dátumy (nie VOD), zoradené od najbližšieho, každý film len raz (s jeho
// najbližšou premiérou), max. 8.
export async function GET() {
  try {
    const rows = await prisma.moviePremiereDate.findMany({
      where: { releaseDate: { gte: new Date(new Date().setHours(0, 0, 0, 0)) }, type: { not: 'VOD' } },
      orderBy: { releaseDate: 'asc' },
      include: { movie: { select: { id: true, title: true, slug: true, poster: true } } }
    });

    const seenMovies = new Set<string>();
    const premieres = [];
    for (const row of rows) {
      if (seenMovies.has(row.movie.id)) continue;
      seenMovies.add(row.movie.id);
      premieres.push({ id: row.id, releaseDate: row.releaseDate, movie: row.movie });
      if (premieres.length >= 8) break;
    }

    return NextResponse.json(premieres, { status: 200 });
  } catch (error) {
    console.error('[api/mobile/premieres]', error);
    return NextResponse.json({ error: 'Chyba pri načítaní premiér.' }, { status: 500 });
  }
}
