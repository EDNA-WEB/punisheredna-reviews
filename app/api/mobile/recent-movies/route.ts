import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 12;

// Rovnaký zdroj ako katalóg na webe — naposledy pridané filmy/seriály,
// zoradené od najnovšieho. Appka posiela ?page=0,1,2...
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(0, parseInt(searchParams.get('page') || '0', 10) || 0);

    const [movies, total] = await Promise.all([
      prisma.movie.findMany({
        where: { approved: true },
        orderBy: { createdAt: 'desc' },
        skip: page * PAGE_SIZE,
        take: PAGE_SIZE,
        select: { id: true, title: true, slug: true, poster: true, year: true, genres: true }
      }),
      prisma.movie.count({ where: { approved: true } })
    ]);

    return NextResponse.json({ movies, totalPages: Math.ceil(total / PAGE_SIZE) }, { status: 200 });
  } catch (error) {
    console.error('[api/mobile/recent-movies]', error);
    return NextResponse.json({ error: 'Chyba pri načítaní filmov.' }, { status: 500 });
  }
}
