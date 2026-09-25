import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// Recenzie a hodnotenia sú v samostatných tabuľkách (niekto môže hodnotiť
// bez písania recenzie), takže hodnotenie k recenzii dohľadáme podľa
// rovnakej dvojice film+autor, s akou bola napísaná recenzia.
//
// ?onlyEditors=true → len recenzie od redaktorov ("overení kritici").
// ?cursor=<id poslednej recenzie> → appka takto plynulo doťahuje ďalšie
// (bez klasického stránkovania čísel).
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const onlyEditors = searchParams.get('onlyEditors') === 'true';
    const cursor = searchParams.get('cursor');
    const limit = parseInt(searchParams.get('limit') || '10', 10);

    const reviews = await prisma.review.findMany({
      where: onlyEditors ? { author: { isEditor: true } } : {},
      orderBy: { createdAt: 'desc' },
      take: limit,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      select: {
        id: true,
        body: true,
        createdAt: true,
        movieId: true,
        seasonId: true,
        episodeId: true,
        authorId: true,
        movie: { select: { title: true, slug: true, poster: true } },
        author: { select: { name: true, avatar: true, isEditor: true } }
      }
    });

    // Jedno dodatočné volanie namiesto opytovania sa na hodnotenie pre
    // každú recenziu zvlášť (N+1) — natiahneme všetky naraz a spárujeme.
    const ratings = await prisma.rating.findMany({
      where: {
        OR: reviews.map((r) => ({
          movieId: r.movieId,
          userId: r.authorId,
          seasonId: r.seasonId,
          episodeId: r.episodeId
        }))
      },
      select: { movieId: true, userId: true, seasonId: true, episodeId: true, value: true }
    });

    const result = reviews.map((r) => {
      const rating = ratings.find(
        (rt) => rt.movieId === r.movieId && rt.userId === r.authorId && rt.seasonId === r.seasonId && rt.episodeId === r.episodeId
      );
      return {
        id: r.id,
        body: r.body,
        createdAt: r.createdAt,
        movie: r.movie,
        author: r.author,
        rating: rating?.value ?? null
      };
    });

    return NextResponse.json({ reviews: result, nextCursor: reviews.length === limit ? reviews[reviews.length - 1].id : null }, { status: 200 });
  } catch (error) {
    console.error('[api/mobile/reviews]', error);
    return NextResponse.json({ error: 'Chyba pri načítaní recenzí.' }, { status: 500 });
  }
}
