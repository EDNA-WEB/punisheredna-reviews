import { NextResponse } from 'next/server';
import { cdnHeaders } from '@/lib/memoCache';
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
    const authorId = searchParams.get('authorId');
    const cursor = searchParams.get('cursor');
    const page = searchParams.get('page');
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const where = authorId ? { authorId } : onlyEditors ? { author: { isEditor: true } } : {};

    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        ...(page ? { skip: parseInt(page, 10) * limit } : cursor ? { skip: 1, cursor: { id: cursor } } : {}),
        select: {
          id: true,
          body: true,
          createdAt: true,
          movieId: true,
          seasonId: true,
          episodeId: true,
          authorId: true,
          movie: { select: { title: true, slug: true, poster: true } },
          author: { select: { id: true, name: true, avatar: true, isEditor: true } }
        }
      }),
      page ? prisma.review.count({ where }) : Promise.resolve(0)
    ]);

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

    return NextResponse.json(
      {
        reviews: result,
        nextCursor: !page && reviews.length === limit ? reviews[reviews.length - 1].id : null,
        totalPages: page ? Math.ceil(total / limit) : undefined
      }, { status: 200, headers: cdnHeaders(60) });
  } catch (error) {
    console.error('[api/mobile/reviews]', error);
    return NextResponse.json({ error: 'Chyba při načítání recenzí.' }, { status: 500 });
  }
}
