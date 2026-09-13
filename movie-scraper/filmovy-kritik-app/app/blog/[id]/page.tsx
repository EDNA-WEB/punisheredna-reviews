import Link from 'next/link';
import type { Metadata } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { trackArticleView } from '@/lib/trackView';
import { notFound } from 'next/navigation';
import { mdToHtml, excerpt } from '@/lib/markdown';
import { articleJsonLd } from '@/lib/jsonLd';
import { IconEdit, IconUser } from '@/components/Icons';
import RequestPublishButton from '@/components/RequestPublishButton';
import ApproveBlogPostButton from '@/components/ApproveBlogPostButton';
import DeleteBlogPostButton from '@/components/DeleteBlogPostButton';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
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

export default async function BlogPostPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const viewerId = (session?.user as any)?.id;
  const isAdmin = (session?.user as any)?.role === 'ADMIN';
  const viewer = viewerId ? await prisma.user.findUnique({ where: { id: viewerId }, select: { membershipUntil: true } }) : null;
  const isMember = !!(viewer?.membershipUntil && viewer.membershipUntil > new Date());

  const post = await prisma.blogPost.findUnique({
    where: { id: params.id },
    include: { author: { select: { id: true, name: true, avatar: true } } }
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

  const relatedByTags = post.tags.length
    ? await prisma.blogPost.findMany({
        where: { id: { not: post.id }, tags: { hasSome: post.tags }, isDraft: false, published: true },
        orderBy: { createdAt: 'desc' },
        take: 4,
        select: { id: true, title: true, coverImage: true }
      })
    : [];

  return (
    <div className="pt-10 max-w-2xl">
      {post.published && (
        <script
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
      {post.coverImage && (
        <img src={post.coverImage} alt={post.title} className="w-full max-h-[360px] object-cover rounded-xl mb-6 bg-surface" />
      )}

      <h1 className="font-display font-extrabold text-3xl text-ink leading-tight mb-3">{post.title}</h1>

      <div className="flex items-center gap-3 mb-6">
        <Link href={`/profile/${post.author.id}`} className="flex items-center gap-2 text-sm font-semibold text-ink hover:text-accent">
          {post.author.avatar ? (
            <img src={post.author.avatar} alt={post.author.name} className="w-7 h-7 rounded-full object-cover" />
          ) : (
            <IconUser className="w-5 h-5" />
          )}
          {post.author.name}
        </Link>
        <span className="text-xs text-muted">{new Date(post.createdAt).toLocaleDateString('sk-SK', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
        {post.isDraft && (
          <span className="text-[11px] font-semibold bg-surface text-accent border border-accent/40 px-2.5 py-1 rounded-full">📝 Rozpísané</span>
        )}
        {post.published && (
          <span className="text-[11px] font-semibold bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-full">Publikované na hlavnej stránke</span>
        )}
      </div>

      {(isOwn || isAdmin) && (
        <div className="flex items-center gap-2 mb-6">
          <Link
            href={`/blog/${post.id}/upravit`}
            className="w-8 h-8 rounded-full flex items-center justify-center text-muted border border-line hover:text-accent hover:border-accent"
          >
            <IconEdit className="w-4 h-4" />
          </Link>
          <DeleteBlogPostButton postId={post.id} />
        </div>
      )}

      <div
        className="article-body text-lg leading-relaxed text-ink font-body mb-6"
        dangerouslySetInnerHTML={{ __html: mdToHtml(post.body) }}
      />

      {post.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-8">
          {post.tags.map((tag) => (
            <span key={tag} className="text-xs font-semibold text-accent bg-surface border border-accent/40 px-2.5 py-1 rounded-full">
              #{tag}
            </span>
          ))}
        </div>
      )}

      {relatedByTags.length > 0 && (
        <div className="mb-10">
          <h2 className="font-display font-bold text-lg text-ink mb-3">Súvisiace články</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {relatedByTags.map((r) => (
              <Link key={r.id} href={`/blog/${r.id}`} className="flex gap-3 border border-line rounded-xl p-3 hover:border-accent transition-colors">
                <div className="w-14 h-14 rounded-lg bg-surface bg-cover bg-center flex-none" style={r.coverImage ? { backgroundImage: `url('${r.coverImage}')` } : undefined} />
                <div className="text-sm font-semibold text-ink line-clamp-2">{r.title}</div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {isOwn && !post.isDraft && !post.published && !post.publicationRequested && <RequestPublishButton postId={post.id} />}
      {isOwn && post.publicationRequested && !post.published && (
        <p className="text-sm text-muted">Žiadosť o publikáciu už bola odoslaná, čaká sa na schválenie administrátorom.</p>
      )}
      {isAdmin && post.publicationRequested && !post.published && <ApproveBlogPostButton postId={post.id} />}
    </div>
  );
}
