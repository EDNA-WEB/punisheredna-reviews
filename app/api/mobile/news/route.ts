import { NextResponse } from 'next/server';
import { cdnHeaders } from '@/lib/memoCache';
import { prisma } from '@/lib/prisma';
import { publishedNewsFilterForMember } from '@/lib/publishedFilter';

export const dynamic = 'force-dynamic';

// Len 3 najnovšie, pre náhľad priamo na hlavnej obrazovke appky.
export async function GET() {
  try {
    const news = await prisma.newsPost.findMany({
      // Bezpečnosť: zdieľaná (CDN) odpoveď pre všetkých → bez 10-hodinového náskoku členov.
      where: publishedNewsFilterForMember(false),
      orderBy: { createdAt: 'desc' },
      take: 3,
      select: { id: true, title: true, slug: true, summary: true, coverImage: true, createdAt: true }
    });

    return NextResponse.json(news, { status: 200, headers: cdnHeaders(120) });
  } catch (error) {
    console.error('[api/mobile/news]', error);
    return NextResponse.json({ error: 'Chyba při načítání novinek.' }, { status: 500 });
  }
}
