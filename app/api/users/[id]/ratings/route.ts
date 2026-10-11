import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sharpImage } from '@/lib/imageQuality';

const PAGE_SIZE = 10;

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { params } = { ...ctx, params: await ctx.params };
  const { searchParams } = new URL(req.url);
  const page = Math.min(10_000, Math.max(1, Math.floor(Number(searchParams.get('page'))) || 1));

  const where = { userId: params.id, seasonId: null, episodeId: null };

  const [ratings, total] = await Promise.all([
    prisma.rating.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { movie: { select: { title: true, slug: true, poster: true, year: true, releaseDate: true } } }
    }),
    prisma.rating.count({ where })
  ]);

  return NextResponse.json({
    ratings: ratings.map((r) => ({
      ...r,
      createdAt: r.createdAt.toISOString(),
      movie: { ...r.movie, poster: r.movie.poster ? sharpImage(r.movie.poster, 60) || r.movie.poster : null }
    })),
    hasMore: page * PAGE_SIZE < total,
    total,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE))
  });
}
