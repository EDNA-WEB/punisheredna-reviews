import { publishedNewsFilterForMember } from '@/lib/publishedFilter';
import { prisma } from '@/lib/prisma';
import { trackArticleView } from '@/lib/trackView';
import { articleJsonLd } from '@/lib/jsonLd';
import type { Metadata } from 'next';
import { mdToHtml, readingTime } from '@/lib/markdown';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import ArticleView from '@/components/article/ArticleView';
import ArticleComments from '@/components/article/ArticleComments';
import { getDictionary, getUserLanguage } from '@/lib/i18n';
import { loadArticleMovie, loadAuthorStats, loadMostRead, loadRelated, plainImg } from '@/lib/articleData';

import { headers } from 'next/headers';
export const dynamic = 'force-dynamic';

export async function generateMetadata(props: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { params } = { ...props, params: await props.params };
  // Nadpis a popis konceptu či naplánovanej novinky sa nesmú dostať do metadát (náhľady na sociálnych sieťach).
  const news = await prisma.newsPost.findFirst({
    where: { slug: params.slug, ...publishedNewsFilterForMember(true) },
    select: { title: true, summary: true, coverImage: true }
  });
  if (!news) return {};
  return {
    title: news.title,
    description: news.summary,
    openGraph: { title: news.title, description: news.summary, images: news.coverImage ? [{ url: news.coverImage }] : undefined, type: 'article' }
  };
}

// Zoskupí surové riadky reakcií (jeden riadok na osobu) na počty podľa
// jednotlivých emoji, na zobrazenie pri komentári.
function summarizeReactions(reactions: { emoji: string }[]): { emoji: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const r of reactions) counts.set(r.emoji, (counts.get(r.emoji) || 0) + 1);
  return Array.from(counts.entries()).map(([emoji, count]) => ({ emoji, count }));
}

export default async function NewsDetailPage(props: { params: Promise<{ slug: string }> }) {
  const { params } = { ...props, params: await props.params };
  const session = await getServerSession(authOptions);
  const viewerId = (session?.user as any)?.id;
  const isAdmin = (session?.user as any)?.role === 'ADMIN';
  const viewer = viewerId ? await prisma.user.findUnique({ where: { id: viewerId }, select: { membershipUntil: true } }) : null;
  const isMember = !!(viewer?.membershipUntil && viewer.membershipUntil > new Date());

  const news = await prisma.newsPost.findUnique({
    where: { slug: params.slug },
    include: {
      author: { select: { id: true, name: true, avatar: true, role: true, bio: true } },
      likes: true,
      comments: {
        where: { parentId: null },
        orderBy: { createdAt: 'asc' },
        include: {
          user: { select: { name: true, role: true, avatar: true, membershipUntil: true } },
          likes: true,
          reactions: true,
          replies: {
            orderBy: { createdAt: 'asc' },
            include: { user: { select: { name: true, role: true, avatar: true, membershipUntil: true } }, likes: true, reactions: true }
          }
        }
      }
    }
  });

  if (!news) return notFound();
  if (news.publishAt && news.publishAt > new Date() && !isAdmin) return notFound();
  // Koncept vidí len administrátor, redaktor a autor — nie bežní členovia.
  const canSeeDraft = isAdmin || !!(session?.user as any)?.isEditor || (!!viewerId && news.author?.id === viewerId);
  if (news.isDraft && !canSeeDraft) return notFound();

  // Golden Ticket členovia vidia novinku hneď po zverejnení, ostatní
  // registrovaní až o 10 hodín neskôr — namiesto matúcej "404" im ukážeme
  // peknú obrazovku s vysvetlením a odkazom na členstvo.
  if (!isAdmin && !isMember) {
    const effectivePublish = news.publishAt || news.createdAt;
    const availableAt = new Date(effectivePublish.getTime() + 10 * 60 * 60 * 1000);
    if (availableAt > new Date()) {
      const hoursLeft = Math.max(1, Math.ceil((availableAt.getTime() - Date.now()) / (60 * 60 * 1000)));
      return (
        <div className="pt-10 max-w-lg mx-auto text-center">
          <img src="/golden-ticket-badge.svg" alt="" width={48} height={48} className="mx-auto mb-4" />
          <h1 className="font-display font-bold text-xl text-ink mb-2">Tato novinka bude dostupná brzy</h1>
          <p className="text-sm text-muted mb-1">
            Golden Ticket členové ji už čtou — ostatním bude dostupná přibližně za {hoursLeft}{' '}
            {hoursLeft === 1 ? 'hodinu' : hoursLeft < 5 ? 'hodiny' : 'hodin'}.
          </p>
          <Link href="/nastavenia/clenstvo" className="inline-block mt-4 text-accent text-sm font-semibold hover:underline">
            Zjistit více o členství →
          </Link>
        </div>
      );
    }
  }

  await trackArticleView('news', news.id);

  const dict = await getDictionary(await getUserLanguage());
  const t = (k: string, f: string) => dict[k] || f;
  const kicker = t('clanok.novinka', 'Novinka');

  const [{ movie, trailerYoutubeId, movieTitle }, mostRead, related, authorStats, followRow] = await Promise.all([
    loadArticleMovie(news.movieId, {
      viewerId,
      readOnly: false,
      img: plainImg,
      labels: {
        premiere: t('clanok.premiera', 'Premiéra'),
        director: t('clanok.rezie', 'Režie'),
        runtime: t('clanok.delka', 'Délka'),
        country: t('clanok.zeme', 'Země'),
        type: t('clanok.typ', 'Typ')
      }
    }),
    loadMostRead('news', news.id, plainImg, kicker, isAdmin || isMember),
    loadRelated('news', news.id, news.tags, plainImg, kicker, isAdmin || isMember),
    loadAuthorStats(news.author.id, { reviews: t('clanok.recenze', 'Recenze'), articles: t('clanok.clanky', 'Články') }),
    viewerId && viewerId !== news.author.id
      ? prisma.follow.findUnique({ where: { followerId_followingId: { followerId: viewerId, followingId: news.author.id } }, select: { id: true } })
      : Promise.resolve(null)
  ]);

  const commentTotal = news.comments.reduce((n, c) => n + 1 + c.replies.length, 0);
  const serializedComments = news.comments.map((c) => ({
    ...c,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt?.toISOString() || c.createdAt.toISOString(),
    reactions: summarizeReactions(c.reactions),
    myReaction: c.reactions.find((r) => r.userId === viewerId)?.emoji || null,
    replies: c.replies.map((r) => ({
      ...r,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt?.toISOString() || r.createdAt.toISOString(),
      reactions: summarizeReactions(r.reactions),
      myReaction: r.reactions.find((rr) => rr.userId === viewerId)?.emoji || null
    }))
  }));

  const cover = plainImg(news.coverImage, 900);

  return (
    <>
      <script
        nonce={(await headers()).get('x-nonce') ?? undefined}
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: articleJsonLd({
            title: news.title,
            description: news.summary,
            image: news.coverImage,
            url: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/news/${news.slug}`,
            authorName: news.author.name,
            publishedAt: news.createdAt,
            tags: news.tags
          })
        }}
      />
      <ArticleView
        readOnly={false}
        kicker={kicker}
        breadcrumb={[
          { label: t('clanok.domu', 'Domů'), href: '/' },
          { label: t('nav.novinky', 'Novinky'), href: '/novinky' },
          ...(news.tags[0] ? [{ label: news.tags[0], href: `/novinky?tag=${encodeURIComponent(news.tags[0])}` }] : [])
        ]}
        chips={movieTitle ? [movieTitle] : []}
        title={news.title}
        perex={null}
        minutes={readingTime(news.body)}
        date={(news.publishAt || news.createdAt).toISOString()}
        author={{
          name: news.author.name,
          avatar: news.author.avatar,
          href: `/profile/${news.author.id}`,
          isCritic: news.author.role === 'ADMIN',
          stats: authorStats,
          bio: news.author.bio || null,
          follow: viewerId && viewerId !== news.author.id ? { targetId: news.author.id, initialFollowing: !!followRow } : null
        }}
        cover={cover}
        trailerYoutubeId={trailerYoutubeId}
        html={mdToHtml(news.body)}
        movie={movie}
        tags={news.tags.map((tag) => ({ label: tag, href: `/novinky?tag=${encodeURIComponent(tag)}` }))}
        likes={{
          myValue: news.likes.find((l) => l.userId === viewerId)?.value || 0,
          likeCount: news.likes.filter((l) => l.value === 1).length,
          dislikeCount: news.likes.filter((l) => l.value === -1).length
        }}
        canReact={!!viewerId && news.author.id !== viewerId}
        likeTarget={{ newsId: news.id }}
        commentCount={commentTotal}
        comments={
          <ArticleComments
            comments={serializedComments}
            total={commentTotal}
            target={{ newsId: news.id }}
            viewerId={viewerId}
            isAdmin={isAdmin}
            isMember={isMember}
            articleAuthorId={news.author.id}
          />
        }
        mostRead={mostRead}
        mostReadTitle={t('clanok.nejctenejsi', 'Nejčtenější')}
        related={related}
        sharePath={`/news/${news.slug}`}
        notice={
          news.isDraft ? (
            <div className="flex items-center gap-2 mb-6 text-xs font-semibold text-accent bg-surface border border-line rounded-full px-3 py-1.5 w-fit">
              <img src="/golden-ticket-badge.svg" alt="" width={16} height={16} />
              {isAdmin ? 'Rozepsané — vidíš to jako administrátor' : 'Dřívější přístup díky Golden Ticket členství — tento článek ještě není veřejně publikovaný'}
            </div>
          ) : null
        }
      />
    </>
  );
}
