import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 12;

// Rovnaký zdroj ako "Teraz dostupné online" na webe — MovieStreamingService
// zoradené od najnovšie pridaného, každý film len raz (jeho najnovšie
// pridanie online). Appka posiela ?page=0,1,2...
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(0, parseInt(searchParams.get('page') || '0', 10) || 0);

    const rows = await prisma.movieStreamingService.findMany({
      where: { movie: { approved: true } },
      orderBy: { createdAt: 'desc' },
      include: { movie: { select: { id: true, title: true, slug: true, poster: true, year: true } } }
    });

    const seen = new Set<string>();
    const deduped: typeof rows = [];
    for (const row of rows) {
      if (seen.has(row.movieId)) continue;
      seen.add(row.movieId);
      deduped.push(row);
    }

    const totalPages = Math.max(1, Math.ceil(deduped.length / PAGE_SIZE));
    const pageItems = deduped.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE).map((r) => r.movie);

    return NextResponse.json({ movies: pageItems, totalPages }, { status: 200 });
  } catch (error) {
    console.error('[api/mobile/online-movies]', error);
    return NextResponse.json({ error: 'Chyba pri načítaní filmov.' }, { status: 500 });
  }
}
