import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const PAGE_SIZE = 10;

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const { searchParams } = new URL(req.url);
  const page = Math.max(1, Number(searchParams.get('page')) || 1);

  const where = { authorId: params.id, seasonId: null, episodeId: null };

  const [reviews, total] = await Promise.all([
    prisma.review.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { movie: { select: { title: true, slug: true, poster: true, year: true, releaseDate: true } } }
    }),
    prisma.review.count({ where })
  ]);

  return NextResponse.json({
    reviews: reviews.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })),
    hasMore: page * PAGE_SIZE < total,
    total,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE))
  });
}
