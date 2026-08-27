import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { checkRateLimit } from '@/lib/antiSpam';

async function resolveTarget(targetKey: any) {
  if (targetKey.reviewId) {
    const review = await prisma.review.findUnique({
      where: { id: targetKey.reviewId },
      include: { movie: { select: { slug: true } } }
    });
    if (!review) return null;
    return { ownerId: review.authorId, link: `/movie/${review.movie.slug}`, kind: 'recenziu' };
  }
  if (targetKey.commentId) {
    const comment = await prisma.comment.findUnique({
      where: { id: targetKey.commentId },
      include: {
        review: { include: { movie: { select: { slug: true } } } },
        news: { select: { slug: true } }
      }
    });
    if (!comment) return null;
    const base = comment.review ? `/movie/${comment.review.movie.slug}` : `/news/${comment.news?.slug}`;
    return { ownerId: comment.userId, link: `${base}#comment-${comment.id}`, kind: 'komentár' };
  }
  if (targetKey.postId) {
    const post = await prisma.post.findUnique({ where: { id: targetKey.postId } });
    if (!post) return null;
    return { ownerId: post.authorId, link: `/diskusie/${post.threadId}`, kind: 'príspevok' };
  }
  if (targetKey.newsId) {
    const news = await prisma.newsPost.findUnique({ where: { id: targetKey.newsId } });
    if (!news) return null;
    return { ownerId: news.authorId, link: `/news/${news.slug}`, kind: 'novinku' };
  }
  return null;
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Musíš byť prihlásený.' }, { status: 401 });

    const userId = (session.user as any).id;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.banned) return NextResponse.json({ error: 'Tvoj účet bol zablokovaný.' }, { status: 403 });

    const { reviewId, commentId, postId, newsId, value } = await req.json();
    const targetKey = reviewId ? { reviewId } : commentId ? { commentId } : postId ? { postId } : newsId ? { newsId } : null;
    const v = Number(value) === -1 ? -1 : 1;
    if (!targetKey) return NextResponse.json({ error: 'Neplatná požiadavka.' }, { status: 400 });

    const target = await resolveTarget(targetKey);
    if (!target) return NextResponse.json({ error: 'Obsah sa nenašiel.' }, { status: 404 });

    if (target.ownerId === userId) {
      return NextResponse.json({ error: 'Na vlastný obsah nemôžeš reagovať.' }, { status: 403 });
    }

    const rateLimitError = await checkRateLimit('like', userId, user.createdAt);
    if (rateLimitError) return NextResponse.json({ error: rateLimitError }, { status: 429 });

    const existing = await prisma.like.findFirst({ where: { userId, ...targetKey } });

    if (existing && existing.value === v) {
      // rovnaká reakcia znova = zrušenie
      await prisma.like.delete({ where: { id: existing.id } });
    } else if (existing) {
      // opačná reakcia = prepnutie
      await prisma.like.update({ where: { id: existing.id }, data: { value: v } });
    } else {
      await prisma.like.create({ data: { userId, value: v, ...targetKey } });
    }

    const [likeCount, dislikeCount] = await Promise.all([
      prisma.like.count({ where: { ...targetKey, value: 1 } }),
      prisma.like.count({ where: { ...targetKey, value: -1 } })
    ]);

    const myValue = existing && existing.value === v ? 0 : v;

    return NextResponse.json({ myValue, likeCount, dislikeCount });
  } catch (err: any) {
    if (err?.code === 'P2002') {
      return NextResponse.json({ error: 'Táto akcia sa už spracováva alebo bola vykonaná.' }, { status: 409 });
    }
    console.error(err);
    return NextResponse.json({ error: 'Požiadavka zlyhala. Skús to prosím znova.' }, { status: 400 });
  }
}
