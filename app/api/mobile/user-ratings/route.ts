import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// Kompletný, plynulo doťahovaný zoznam hodnotení konkrétneho používateľa
// (rovnaký princíp cursoru ako /api/mobile/reviews).
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const authorId = searchParams.get('authorId');
    if (!authorId) return NextResponse.json({ error: 'Chýba authorId.' }, { status: 400 });
    const cursor = searchParams.get('cursor');
    const limit = parseInt(searchParams.get('limit') || '10', 10);

    const ratings = await prisma.rating.findMany({
      where: { userId: authorId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      select: {
        id: true,
        value: true,
        createdAt: true,
        movie: { select: { title: true, slug: true, poster: true } },
        season: { select: { number: true } },
        episode: { select: { number: true, title: true } }
      }
    });

    const result = ratings.map((r) => ({
      id: r.id,
      value: r.value,
      createdAt: r.createdAt,
      movie: {
        ...r.movie,
        displayTitle: r.episode && r.season
          ? `${r.movie.title} - S${r.season.number}E${r.episode.number}${r.episode.title ? `: ${r.episode.title}` : ''}`
          : r.season
          ? `${r.movie.title} - Sezóna ${r.season.number}`
          : r.movie.title
      }
    }));

    return NextResponse.json({ ratings: result, nextCursor: ratings.length === limit ? ratings[ratings.length - 1].id : null }, { status: 200 });
  } catch (error) {
    console.error('[api/mobile/user-ratings]', error);
    return NextResponse.json({ error: 'Chyba při načítání hodnocení.' }, { status: 500 });
  }
}
