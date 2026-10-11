import Link from 'next/link';
import type { Metadata } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { trackArticleView } from '@/lib/trackView';
import { notFound } from 'next/navigation';
import { mdToHtml, excerpt, readingTime } from '@/lib/markdown';
import { articleJsonLd } from '@/lib/jsonLd';
import { IconEdit } from '@/components/Icons';
import ArticleView from '@/components/article/ArticleView';
import { getDictionary, getUserLanguage } from '@/lib/i18n';
import { loadAuthorStats, loadMostRead, loadRelated, plainImg } from '@/lib/articleData';
import RequestPublishButton from '@/components/RequestPublishButton';
import ApproveBlogPostButton from '@/components/ApproveBlogPostButton';
import DeleteBlogPostButton from '@/components/DeleteBlogPostButton';

import { headers } from 'next/headers';
export const dynamic = 'force-dynamic';

export async function generateMetadata(props: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { params } = { ...props, params: await props.params };
  const post = await prisma.blogPost.findUnique({
    where: { id: params.id },
    select: { title: true, body: true, coverImage: true, isDraft: true, published: true }
  });
  if (!post || post.isDraft) return {};
  const description = excerpt(post.body, 160);
  return {
    title: post.title,
    description,
    openGraph: { title: post.title, description, images: post.coverImage ? [{ url: post.coverImage }] : undefined, type: 'article' }
  };
}

export default async function BlogPostPage(props: { params: Promise<{ id: string }> }) {
  const { params } = { ...props, params: await props.params };
  const session = await getServerSession(authOptions);
  const viewerId = (session?.user as any)?.id;
  const isAdmin = (session?.user as any)?.role === 'ADMIN';
  const viewer = viewerId ? await prisma.user.findUnique({ where: { id: viewerId }, select: { membershipUntil: true } }) : null;
  const isMember = !!(viewer?.membershipUntil && viewer.membershipUntil > new Date());

  const post = await prisma.blogPost.findUnique({
    where: { id: params.id },
    include: { author: { select: { id: true, name: true, avatar: true, role: true, bio: true } } }
  });
  if (!post) return notFound();

  const isOwn = post.authorId === viewerId;
  const draftBlocked = post.isDraft && !isMember;
  const unpublishedAndNotDraft = !post.isDraft && !post.published;
  if (!isOwn && !isAdmin && (draftBlocked || unpublishedAndNotDraft)) {
    // Rozpísané (koncept) vidí navyše aj Golden Ticket člen (skorý prístup).
    // Neschválené súkromné články (nie koncept, len ešte neschválené na hlavnú stránku) vidí len autor a administrátor.
    return notFound();
  }

  await trackArticleView('blog', post.id);

  const dict = await getDictionary(await getUserLanguage());
  const t = (k: string, f: string) => dict[k] || f;
  const kicker = t('clanok.clanek', 'Článek');

  const [mostRead, related, authorStats, followRow] = await Promise.all([
    loadMostRead('blog', post.id, plainImg, kicker),
    loadRelated('blog', post.id, post.tags, plainImg, kicker),
    loadAuthorStats(post.author.id, { reviews: t('clanok.recenze', 'Recenze'), articles: t('clanok.clanky', 'Články') }),
    viewerId && viewerId !== post.author.id
      ? prisma.follow.findUnique({ where: { followerId_followingId: { followerId: viewerId, followingId: post.author.id } }, select: { id: true } })
      : Promise.resolve(null)
  ]);

  const statusBadges = (post.isDraft || post.published) && (
    <div className="flex flex-wrap items-center gap-2 mb-5">
      {post.isDraft && <span className="text-xs font-semibold bg-surface text-accent border border-line px-2.5 py-1 rounded-full">Rozpísané</span>}
      {post.published && <span className="text-xs font-semibold bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-full">Publikované na hlavnej stránke</span>}
    </div>
  );

  const ownerBar = (isOwn || isAdmin) && (
    <div className="flex flex-wrap items-center gap-2 mb-6">
      <Link
        href={`/blog/${post.id}/upravit`}
        className="w-8 h-8 rounded-full flex items-center justify-center text-muted border border-line hover:text-accent hover:border-accent"
      >
        <IconEdit className="w-4 h-4" />
      </Link>
      <DeleteBlogPostButton postId={post.id} />
      {isOwn && !post.isDraft && !post.published && !post.publicationRequested && <RequestPublishButton postId={post.id} />}
      {isOwn && post.publicationRequested && !post.published && (
        <p className="text-sm text-muted">Žádost o publikaci už byla odeslána, čeká se na schválení administrátorem.</p>
      )}
      {isAdmin && post.publicationRequested && !post.published && <ApproveBlogPostButton postId={post.id} />}
    </div>
  );

  return (
    <>
      {post.published && (
        <script
          nonce={(await headers()).get('x-nonce') ?? undefined}
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: articleJsonLd({
              title: post.title,
              description: excerpt(post.body, 160),
              image: post.coverImage,
              url: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/blog/${post.id}`,
              authorName: post.author.name,
              publishedAt: post.createdAt,
              tags: post.tags
            })
          }}
        />
      )}
      <ArticleView
        readOnly={false}
        kicker={kicker}
        breadcrumb={[
          { label: t('clanok.domu', 'Domů'), href: '/' },
          { label: t('clanok.blog', 'Blog'), href: null }
        ]}
        chips={[]}
        title={post.title}
        perex={null}
        minutes={readingTime(post.body)}
        date={post.createdAt.toISOString()}
        author={{
          name: post.author.name,
          avatar: post.author.avatar,
          href: `/profile/${post.author.id}`,
          isCritic: post.author.role === 'ADMIN',
          stats: authorStats,
          bio: post.author.bio || null,
          follow: viewerId && viewerId !== post.author.id ? { targetId: post.author.id, initialFollowing: !!followRow } : null
        }}
        cover={plainImg(post.coverImage, 900)}
        trailerYoutubeId={null}
        html={mdToHtml(post.body)}
        movie={null}
        tags={post.tags.map((tag) => ({ label: tag, href: null }))}
        likes={null}
        canReact={false}
        likeTarget={null}
        commentCount={null}
        mostRead={mostRead}
        mostReadTitle={t('clanok.nejctenejsi', 'Nejčtenější')}
        related={related}
        sharePath={`/blog/${post.id}`}
        notice={statusBadges || null}
        adminBar={ownerBar || null}
      />
    </>
  );
}
