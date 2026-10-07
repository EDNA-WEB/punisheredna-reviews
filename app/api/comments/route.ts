import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { publishedNewsFilterForMember } from '@/lib/publishedFilter';
import { isActiveMember } from '@/lib/membership';
import { logActivity } from '@/lib/logActivity';
import { checkRateLimit, looksLikeSpam } from '@/lib/antiSpam';

import { hasInjectedObject } from '@/lib/inputGuard';
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Pro přidání komentáře se musíš přihlásit.' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.banned) {
      return NextResponse.json({ error: 'Tvůj účet byl zablokován, nemůžeš přidávat komentáře.' }, { status: 403 });
    }
    if (user.commentsDisabled) {
      return NextResponse.json({ error: 'Administrátor ti omezil možnost přidávat komentáře.' }, { status: 403 });
    }

    const { reviewId, newsId, movieId, parentId, body } = await req.json();
    if (hasInjectedObject(reviewId, newsId, movieId, parentId)) return NextResponse.json({ error: 'Neplatné údaje.' }, { status: 400 });
    if ((!reviewId && !newsId && !movieId) || !body || !String(body).trim()) {
      return NextResponse.json({ error: 'Komentář nemůže být prázdný.' }, { status: 400 });
    }
    if (String(body).length > 2000) {
      return NextResponse.json({ error: 'Komentář je příliš dlouhý (max. 2000 znaků).' }, { status: 400 });
    }

    const spamReason = looksLikeSpam(String(body));
    if (spamReason) return NextResponse.json({ error: spamReason }, { status: 400 });

    const rateLimitError = await checkRateLimit('comment', userId, user.createdAt);
    if (rateLimitError) return NextResponse.json({ error: rateLimitError }, { status: 429 });

    let link: string | null = null;
    let movieSlugForFollowers: string | null = null;
    if (reviewId) {
      const review = await prisma.review.findUnique({ where: { id: reviewId }, include: { movie: { select: { slug: true } } } });
      if (!review) return NextResponse.json({ error: 'Recenze se nenašla.' }, { status: 404 });
      link = `/movie/${review.movie.slug}`;
    } else if (newsId) {
      // Komentovať sa dá len zverejnenú novinku (koncept len autor / admin / redaktor).
      const privileged = user.role === 'ADMIN' || !!(user as any).isEditor;
      const news = await prisma.newsPost.findFirst({
        where: privileged
          ? { id: newsId }
          : { id: newsId, OR: [{ authorId: userId }, publishedNewsFilterForMember(await isActiveMember(userId))] },
        select: { slug: true }
      });
      if (!news) return NextResponse.json({ error: 'Novinka se nenašla.' }, { status: 404 });
      link = `/news/${news.slug}`;
    } else if (movieId) {
      const movie = await prisma.movie.findUnique({ where: { id: movieId }, select: { slug: true } });
      if (!movie) return NextResponse.json({ error: 'Film se nenašel.' }, { status: 404 });
      link = `/movie/${movie.slug}`;
      movieSlugForFollowers = movie.slug;
    }

    const comment = await prisma.comment.create({
      data: {
        body: String(body).trim(),
        reviewId: reviewId || null,
        newsId: newsId || null,
        movieId: movieId || null,
        parentId: parentId || null,
        userId
      },
      include: { user: { select: { name: true, role: true, avatar: true } } }
    });

    if (link) {
      logActivity(userId, `Komentár k ${reviewId ? 'recenzii' : newsId ? 'novinke' : 'diskusii o filme'}`, link);
    }

    // Priama notifikácia tomu, komu niekto odpovedal
    if (parentId) {
      const parent = await prisma.comment.findUnique({ where: { id: parentId } });
      if (parent && parent.userId !== userId) {
        await prisma.notification.create({
          data: {
            userId: parent.userId,
            actorName: user.name,
            type: 'REPLY',
            text: `${user.name} odpověděl(a) na tvůj komentář`,
            link: `${link}#comment-${comment.id}`
          }
        });
      }
    }

    // Nový príspevok do diskusie k filmu -> upozorni všetkých, čo diskusiu sledujú (okrem autora)
    if (movieId) {
      const followers = await prisma.movieDiscussionFollow.findMany({
        where: { movieId, userId: { not: userId } },
        select: { userId: true }
      });
      if (followers.length > 0) {
        await prisma.notification.createMany({
          data: followers.map((f) => ({
            userId: f.userId,
            actorName: user.name,
            type: 'MOVIE_DISCUSSION',
            text: `${user.name} napsal(a) příspěvek do diskuze, kterou sleduješ`,
            link: `${link}#comment-${comment.id}`
          }))
        });
      }
    }

    // Upozorni fanúšikov autora komentára o jeho novej aktivite
    const fans = await prisma.follow.findMany({ where: { followingId: userId }, select: { followerId: true } });
    if (fans.length > 0 && link) {
      await prisma.notification.createMany({
        data: fans.map((f) => ({
          userId: f.followerId,
          actorName: user.name,
          type: 'COMMENT',
          text: `${user.name} napsal(a) komentář`,
          link: `${link}#comment-${comment.id}`
        }))
      });
    }

    return NextResponse.json(comment, { status: 201 });
  } catch (err: any) {
    if (err?.code === 'P2002') {
      return NextResponse.json({ error: 'Tato akce se už zpracovává nebo byla provedena.' }, { status: 409 });
    }
    console.error(err);
    return NextResponse.json({ error: 'Požadavek selhal. Zkus to prosím znovu.' }, { status: 400 });
  }
}
