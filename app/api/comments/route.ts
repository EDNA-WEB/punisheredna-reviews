import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logActivity } from '@/lib/logActivity';
import { checkRateLimit, looksLikeSpam } from '@/lib/antiSpam';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Na pridanie komentára sa musíš prihlásiť.' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.banned) {
      return NextResponse.json({ error: 'Tvoj účet bol zablokovaný, nemôžeš pridávať komentáre.' }, { status: 403 });
    }
    if (user.commentsDisabled) {
      return NextResponse.json({ error: 'Administrátor ti obmedzil možnosť pridávať komentáre.' }, { status: 403 });
    }

    const { reviewId, newsId, movieId, parentId, body } = await req.json();
    if ((!reviewId && !newsId && !movieId) || !body || !String(body).trim()) {
      return NextResponse.json({ error: 'Komentár nemôže byť prázdny.' }, { status: 400 });
    }
    if (String(body).length > 2000) {
      return NextResponse.json({ error: 'Komentár je príliš dlhý (max. 2000 znakov).' }, { status: 400 });
    }

    const spamReason = looksLikeSpam(String(body));
    if (spamReason) return NextResponse.json({ error: spamReason }, { status: 400 });

    const rateLimitError = await checkRateLimit('comment', userId, user.createdAt);
    if (rateLimitError) return NextResponse.json({ error: rateLimitError }, { status: 429 });

    let link: string | null = null;
    let movieSlugForFollowers: string | null = null;
    if (reviewId) {
      const review = await prisma.review.findUnique({ where: { id: reviewId }, include: { movie: { select: { slug: true } } } });
      if (!review) return NextResponse.json({ error: 'Recenzia sa nenašla.' }, { status: 404 });
      link = `/movie/${review.movie.slug}`;
    } else if (newsId) {
      const news = await prisma.newsPost.findUnique({ where: { id: newsId }, select: { slug: true } });
      if (!news) return NextResponse.json({ error: 'Novinka sa nenašla.' }, { status: 404 });
      link = `/news/${news.slug}`;
    } else if (movieId) {
      const movie = await prisma.movie.findUnique({ where: { id: movieId }, select: { slug: true } });
      if (!movie) return NextResponse.json({ error: 'Film sa nenašiel.' }, { status: 404 });
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
            text: `${user.name} odpovedal(a) na tvoj komentár`,
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
            text: `${user.name} napísal(a) príspevok do diskusie, ktorú sleduješ`,
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
          text: `${user.name} napísal(a) komentár`,
          link: `${link}#comment-${comment.id}`
        }))
      });
    }

    return NextResponse.json(comment, { status: 201 });
  } catch (err: any) {
    if (err?.code === 'P2002') {
      return NextResponse.json({ error: 'Táto akcia sa už spracováva alebo bola vykonaná.' }, { status: 409 });
    }
    console.error(err);
    return NextResponse.json({ error: 'Požiadavka zlyhala. Skús to prosím znova.' }, { status: 400 });
  }
}
