import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const PAGE_SIZE = 20;

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const { searchParams } = new URL(req.url);
  const page = Math.max(1, Number(searchParams.get('page')) || 1);

  const ratings = await prisma.rating.findMany({
    where: { userId: params.id, seasonId: null, episodeId: null },
    orderBy: { createdAt: 'desc' },
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
    include: { movie: { select: { title: true, slug: true, poster: true, year: true, releaseDate: true } } }
  });

  return NextResponse.json({
    ratings: ratings.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })),
    hasMore: ratings.length === PAGE_SIZE
  });
}
