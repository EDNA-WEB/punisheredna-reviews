import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 12;

// Rovnaká logika ako "populárne filmy" na hlavnej stránke webu — zoradené
// podľa POČTU hodnotení (nie samostatné sledovanie návštev, to web
// nepoužíva). Appka posiela ?page=0,1,2...
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(0, parseInt(searchParams.get('page') || '0', 10) || 0);
    const contentType = searchParams.get('contentType');

    const where: any = { approved: true };
    if (contentType) where.contentType = contentType;

    const [movies, total] = await Promise.all([
      prisma.movie.findMany({
        where,
        orderBy: { ratings: { _count: 'desc' } },
        skip: page * PAGE_SIZE,
        take: PAGE_SIZE,
        select: {
          id: true,
          title: true,
          slug: true,
          poster: true,
          year: true,
          genres: true,
          countries: true,
          ratings: { select: { value: true } }
        }
      }),
      prisma.movie.count({ where })
    ]);

    const result = movies.map((m) => {
      const avg = m.ratings.length > 0 ? m.ratings.reduce((s, r) => s + r.value, 0) / m.ratings.length : null;
      const { ratings, ...rest } = m;
      return { ...rest, averageRating: avg };
    });

    return NextResponse.json({ movies: result, totalPages: Math.ceil(total / PAGE_SIZE) }, { status: 200 });
  } catch (error) {
    console.error('[api/mobile/popular-movies]', error);
    return NextResponse.json({ error: 'Chyba pri načítaní filmov.' }, { status: 500 });
  }
}
