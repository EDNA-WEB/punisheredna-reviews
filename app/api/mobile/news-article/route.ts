import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getMobileUser } from '@/lib/mobileAuth';

export const dynamic = 'force-dynamic';

// Rovnaká logika ako web (app/news/[slug]/page.tsx) — appka si telo článku
// (markdown) naformátuje sama natívne namiesto mdToHtml.
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const slug = searchParams.get('slug');
    if (!slug) return NextResponse.json({ error: 'Chýba slug.' }, { status: 400 });

    const me = await getMobileUser(req);

    const news = await prisma.newsPost.findUnique({
      where: { slug },
      include: {
        author: { select: { id: true, name: true, avatar: true } },
        likes: true,
        comments: {
          where: { parentId: null },
          orderBy: { createdAt: 'asc' },
          include: {
            user: { select: { id: true, name: true, avatar: true } },
            likes: true,
            replies: {
              orderBy: { createdAt: 'asc' },
              include: { user: { select: { id: true, name: true, avatar: true } }, likes: true }
            }
          }
        }
      }
    });
    if (!news) return NextResponse.json({ error: 'Článek se nenašel.' }, { status: 404 });

    function mapComment(c: any) {
      return {
        id: c.id,
        body: c.body,
        createdAt: c.createdAt,
        user: c.user,
        likesCount: c.likes.length,
        likedByMe: me ? c.likes.some((l: any) => l.userId === me.id) : false,
        replies: (c.replies || []).map(mapComment)
      };
    }

    return NextResponse.json(
      {
        id: news.id,
        title: news.title,
        summary: news.summary,
        body: news.body,
        coverImage: news.coverImage,
        createdAt: news.createdAt,
        author: news.author,
        likesCount: news.likes.length,
        likedByMe: me ? news.likes.some((l) => l.userId === me.id) : false,
        commentsCount: news.comments.reduce((sum, c) => sum + 1 + c.replies.length, 0),
        comments: news.comments.map(mapComment)
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[api/mobile/news-article]', error);
    return NextResponse.json({ error: 'Chyba při načítání.' }, { status: 500 });
  }
}
