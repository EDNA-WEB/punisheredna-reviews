import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const PAGE_SIZE = 20;

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const { searchParams } = new URL(req.url);
  const page = Math.max(1, Number(searchParams.get('page')) || 1);

  const reviews = await prisma.review.findMany({
    where: { authorId: params.id, seasonId: null, episodeId: null },
    orderBy: { createdAt: 'desc' },
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
    include: { movie: { select: { title: true, slug: true, poster: true, year: true, releaseDate: true } } }
  });

  return NextResponse.json({
    reviews: reviews.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })),
    hasMore: reviews.length === PAGE_SIZE
  });
}
