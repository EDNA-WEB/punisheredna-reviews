import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get('q') || '').trim();
  if (q.length < 2) return NextResponse.json([]);

  const movies = await prisma.movie.findMany({
    where: {
      approved: true,
      budget: { not: null },
      OR: [{ title: { contains: q, mode: 'insensitive' } }, { originalTitle: { contains: q, mode: 'insensitive' } }]
    },
    select: { id: true, title: true, year: true, poster: true },
    take: 8
  });

  return NextResponse.json(movies);
}
