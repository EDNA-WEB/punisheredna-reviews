import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getMobileUser } from '@/lib/mobileAuth';
import { readingTime } from '@/lib/markdown';
import { publishedNewsFilterForMember } from '@/lib/publishedFilter';
import { loadArticleMovie, loadAuthorStats, loadMostRead, loadRelated, plainImg } from '@/lib/articleData';

export const dynamic = 'force-dynamic';

// Rovnaká logika ako web (app/news/[slug]/page.tsx) — appka si telo článku
// (markdown) naformátuje sama natívne namiesto mdToHtml.
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const slug = searchParams.get('slug');
    if (!slug) return NextResponse.json({ error: 'Chýba slug.' }, { status: 400 });

    const me = await getMobileUser(req);

    // Bezpečnosť: koncepty a naplánované články vidí len admin, editor alebo
    // autor; ostatní len zverejnené (neplatiaci s 10-hodinovým oneskorením).
    const privileged = !!me && (me.role === 'ADMIN' || (me as any).isEditor);
    const isMember = !!me && !!me.membershipUntil && new Date(me.membershipUntil) > new Date();
    const visibility = privileged ? {} : me ? { OR: [{ authorId: me.id }, publishedNewsFilterForMember(isMember)] } : publishedNewsFilterForMember(false);
    const news = await prisma.newsPost.findFirst({
      where: { slug, ...visibility },
      include: {
        author: { select: { id: true, name: true, avatar: true, role: true, bio: true } },
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
        // Nové zobrazenie článku v appke: palce hore, moja reakcia, autor článku
        likeCount: c.likes.filter((l: any) => l.value === 1).length,
        myValue: me ? c.likes.find((l: any) => l.userId === me.id)?.value || 0 : 0,
        isArticleAuthor: c.user?.id === news!.authorId,
        replies: (c.replies || []).map(mapComment)
      };
    }

    // Doplnky pre nové zobrazenie článku (rovnaké údaje ako web — lib/articleData.ts)
    const seesEarly = privileged || isMember;
    const [movieData, mostRead, related, authorStats, followRow] = await Promise.all([
      loadArticleMovie(news.movieId, {
        viewerId: me?.id || null,
        readOnly: false,
        img: plainImg,
        labels: { premiere: 'Premiéra', director: 'Režie', runtime: 'Délka', country: 'Země', type: 'Typ' }
      }),
      loadMostRead('news', news.id, plainImg, 'Novinka', seesEarly),
      loadRelated('news', news.id, news.tags, plainImg, 'Novinka', seesEarly),
      loadAuthorStats(news.author.id, { reviews: 'Recenze', articles: 'Články' }),
      me && me.id !== news.author.id
        ? prisma.follow.findUnique({ where: { followerId_followingId: { followerId: me.id, followingId: news.author.id } }, select: { id: true } })
        : Promise.resolve(null)
    ]);
    const slugOf = (href: string | null) => {
      if (!href) return null;
      const last = href.split('/').pop() || '';
      try {
        return decodeURIComponent(last);
      } catch {
        return last;
      }
    };

    return NextResponse.json(
      {
        id: news.id,
        title: news.title,
        summary: news.summary,
        body: news.body,
        coverImage: news.coverImage,
        createdAt: news.createdAt,
        author: { id: news.author.id, name: news.author.name, avatar: news.author.avatar },
        slug: news.slug,
        tags: news.tags,
        readingMinutes: readingTime(news.body),
        // Páči sa / nepáči sa — rovnako ako web (ReactionButtons).
        likeCount: news.likes.filter((l) => l.value === 1).length,
        dislikeCount: news.likes.filter((l) => l.value === -1).length,
        myReaction: me ? news.likes.find((l) => l.userId === me.id)?.value || 0 : 0,
        isMine: !!me && news.authorId === me.id,
        // Staré polia ponechané pre spätnú kompatibilitu so staršou verziou appky.
        likesCount: news.likes.filter((l) => l.value === 1).length,
        likedByMe: me ? news.likes.some((l) => l.userId === me.id && l.value === 1) : false,
        commentsCount: news.comments.reduce((sum, c) => sum + 1 + c.replies.length, 0),
        comments: news.comments.map(mapComment),
        // --- nové zobrazenie článku ---
        publishedAt: news.publishAt || news.createdAt,
        coverSharp: plainImg(news.coverImage, 600),
        authorInfo: {
          isCritic: news.author.role === 'ADMIN',
          bio: news.author.bio || null,
          stats: authorStats,
          following: !!followRow
        },
        trailerYoutubeId: movieData.trailerYoutubeId,
        movie: movieData.movie
          ? {
              ...movieData.movie,
              slug: slugOf(movieData.movie.href),
              cast: movieData.movie.cast.map((a) => ({ name: a.name, photo: a.photo, personSlug: slugOf(a.href) }))
            }
          : null,
        mostRead: mostRead.map((m) => ({ id: m.key, title: m.title, slug: slugOf(m.href), image: m.image })),
        related: related.map((r) => ({ id: r.key, title: r.title, slug: slugOf(r.href), image: r.image, minutes: r.minutes || null }))
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[api/mobile/news-article]', error);
    return NextResponse.json({ error: 'Chyba při načítání.' }, { status: 500 });
  }
}
