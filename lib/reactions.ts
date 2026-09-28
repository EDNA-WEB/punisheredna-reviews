import { prisma } from './prisma';
import { checkRateLimit } from './antiSpam';

// Zdieľaná logika reakcií (páči sa / nepáči sa) — používa ju web
// (app/api/likes) aj appka (app/api/mobile/reaction), nech sa pravidlá
// nikdy nerozídu. Rovnaká reakcia znova = zrušenie, opačná = prepnutie,
// na vlastný obsah sa reagovať nedá.

export type ReactionTargetKey = { reviewId: string } | { commentId: string } | { postId: string } | { newsId: string };

export function reactionTargetKey(body: any): ReactionTargetKey | null {
  const { reviewId, commentId, postId, newsId } = body || {};
  return reviewId ? { reviewId } : commentId ? { commentId } : postId ? { postId } : newsId ? { newsId } : null;
}

export async function resolveReactionTarget(targetKey: any) {
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

// Vráti { status, body } — volajúci endpoint to len pošle ako odpoveď.
export async function applyReaction(
  user: { id: string; createdAt: Date },
  targetKey: ReactionTargetKey,
  value: unknown
): Promise<{ status: number; body: any }> {
  const v = Number(value) === -1 ? -1 : 1;

  const target = await resolveReactionTarget(targetKey);
  if (!target) return { status: 404, body: { error: 'Obsah sa nenašiel.' } };
  if (target.ownerId === user.id) return { status: 403, body: { error: 'Na vlastný obsah nemôžeš reagovať.' } };

  const rateLimitError = await checkRateLimit('like', user.id, user.createdAt);
  if (rateLimitError) return { status: 429, body: { error: rateLimitError } };

  const existing = await prisma.like.findFirst({ where: { userId: user.id, ...targetKey } });
  if (existing && existing.value === v) {
    await prisma.like.delete({ where: { id: existing.id } });
  } else if (existing) {
    await prisma.like.update({ where: { id: existing.id }, data: { value: v } });
  } else {
    await prisma.like.create({ data: { userId: user.id, value: v, ...targetKey } });
  }

  const [likeCount, dislikeCount] = await Promise.all([
    prisma.like.count({ where: { ...targetKey, value: 1 } }),
    prisma.like.count({ where: { ...targetKey, value: -1 } })
  ]);
  const myValue = existing && existing.value === v ? 0 : v;
  return { status: 200, body: { myValue, likeCount, dislikeCount } };
}
