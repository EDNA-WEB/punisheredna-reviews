import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sharpImage } from '@/lib/imageQuality';

const PAGE_SIZE = 10;

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { params } = { ...ctx, params: await ctx.params };
  const { searchParams } = new URL(req.url);
  const page = Math.min(10_000, Math.max(1, Math.floor(Number(searchParams.get('page'))) || 1));

  const where = { authorId: params.id, seasonId: null, episodeId: null };

  const [reviews, total] = await Promise.all([
    prisma.review.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        movie: { select: { id: true, title: true, slug: true, poster: true, year: true, releaseDate: true } },
        _count: { select: { comments: true, likes: { where: { value: 1 } } } }
      }
    }),
    prisma.review.count({ where })
  ]);

  // Rovnaký tvar ako prvá strana profilu: hodnotenie autora, palce, komentáre, ostrý plagát
  const ownRatings = reviews.length
    ? await prisma.rating.findMany({
        where: { userId: params.id, movieId: { in: reviews.map((r) => r.movie.id) }, seasonId: null, episodeId: null },
        select: { movieId: true, value: true }
      })
    : [];
  const ratingByMovie = new Map(ownRatings.map((r) => [r.movieId, r.value]));

  return NextResponse.json({
    reviews: reviews.map(({ _count, ...r }) => ({
      ...r,
      createdAt: r.createdAt.toISOString(),
      movie: { ...r.movie, poster: r.movie.poster ? sharpImage(r.movie.poster, 90) || r.movie.poster : null },
      rating: ratingByMovie.get(r.movie.id) ?? null,
      likeCount: _count.likes,
      commentCount: _count.comments
    })),
    hasMore: page * PAGE_SIZE < total,
    total,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE))
  });
}
