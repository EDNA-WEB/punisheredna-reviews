import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Ľahké vyhľadávanie pre redakčný editor — hľadá naraz filmy/seriály aj osobnosti,
// aby autor vedel do textu vložiť klikateľný odkaz jedným kliknutím.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get('q') || '').trim();
  const type = searchParams.get('type');

  if (q.length < 2) return NextResponse.json({ movies: [], people: [] });

  const [movies, people] = await Promise.all([
    type === 'person'
      ? []
      : prisma.movie.findMany({
          where: { approved: true, title: { contains: q, mode: 'insensitive' } },
          orderBy: { createdAt: 'desc' },
          take: 8,
          select: { id: true, title: true, slug: true, year: true, poster: true }
        }),
    type === 'movie'
      ? []
      : prisma.person.findMany({
          where: { approved: true, name: { contains: q, mode: 'insensitive' } },
          orderBy: { name: 'asc' },
          take: 8,
          select: { id: true, name: true, slug: true, photo: true }
        })
  ]);

  return NextResponse.json({ movies, people });
}
