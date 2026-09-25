import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { publishedNewsFilter } from '@/lib/publishedFilter';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 5;

// Appka posiela ?page=0,1,2... a ?sort=newest|oldest|liked|commented.
// "liked"/"commented" sa v Prisma nedá triediť priamo cez počet vzťahov pri
// findMany (_count v orderBy funguje, tak to použijeme).
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(0, parseInt(searchParams.get('page') || '0', 10) || 0);
    const sort = searchParams.get('sort') || 'newest';

    let orderBy: any = { createdAt: 'desc' };
    if (sort === 'oldest') orderBy = { createdAt: 'asc' };
    if (sort === 'liked') orderBy = { likes: { _count: 'desc' } };
    if (sort === 'commented') orderBy = { comments: { _count: 'desc' } };

    const news = await prisma.newsPost.findMany({
      where: publishedNewsFilter(),
      orderBy,
      skip: page * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        title: true,
        slug: true,
        summary: true,
        coverImage: true,
        createdAt: true,
        _count: { select: { likes: true, comments: true } }
      }
    });

    return NextResponse.json({ news, hasMore: news.length === PAGE_SIZE }, { status: 200 });
  } catch (error) {
    console.error('[api/mobile/news-list]', error);
    return NextResponse.json({ error: 'Chyba pri načítaní noviniek.' }, { status: 500 });
  }
}
