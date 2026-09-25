import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { publishedNewsFilter } from '@/lib/publishedFilter';

export const dynamic = 'force-dynamic';

// Len 3 najnovšie, pre náhľad priamo na hlavnej obrazovke appky.
export async function GET() {
  try {
    const news = await prisma.newsPost.findMany({
      where: publishedNewsFilter(),
      orderBy: { createdAt: 'desc' },
      take: 3,
      select: { id: true, title: true, slug: true, summary: true, coverImage: true, createdAt: true }
    });

    return NextResponse.json(news, { status: 200 });
  } catch (error) {
    console.error('[api/mobile/news]', error);
    return NextResponse.json({ error: 'Chyba pri načítaní noviniek.' }, { status: 500 });
  }
}
