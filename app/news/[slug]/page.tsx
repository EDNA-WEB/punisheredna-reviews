import { prisma } from '@/lib/prisma';
import { trackArticleView } from '@/lib/trackView';
import { articleJsonLd } from '@/lib/jsonLd';
import type { Metadata } from 'next';
import { mdToHtml, readingTime } from '@/lib/markdown';
import { IconUser, IconClock, IconBook } from '@/components/Icons';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import ReactionButtons from '@/components/ReactionButtons';
import CommentItem from '@/components/CommentItem';
import CommentForm from '@/components/CommentForm';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const news = await prisma.newsPost.findUnique({ where: { slug: params.slug }, select: { title: true, summary: true, coverImage: true } });
  if (!news) return {};
  return {
    title: news.title,
    description: news.summary,
    openGraph: { title: news.title, description: news.summary, images: news.coverImage ? [{ url: news.coverImage }] : undefined, type: 'article' }
  };
}

export default async function NewsDetailPage({ params }: { params: { slug: string } }) {
  const session = await getServerSession(authOptions);
  const viewerId = (session?.user as any)?.id;
  const isAdmin = (session?.user as any)?.role === 'ADMIN';
  const viewer = viewerId ? await prisma.user.findUnique({ where: { id: viewerId }, select: { membershipUntil: true } }) : null;
  const isMember = !!(viewer?.membershipUntil && viewer.membershipUntil > new Date());

  const news = await prisma.newsPost.findUnique({
    where: { slug: params.slug },
    include: {
      author: { select: { id: true, name: true, avatar: true } },
      likes: true,
      comments: {
        where: { parentId: null },
        orderBy: { createdAt: 'asc' },
        include: {
          user: { select: { name: true, role: true, avatar: true, membershipUntil: true } },
          likes: true,
          replies: {
            orderBy: { createdAt: 'asc' },
            include: { user: { select: { name: true, role: true, avatar: true, membershipUntil: true } }, likes: true }
          }
        }
      }
    }
  });

  if (!news) return notFound();
  if (news.publishAt && news.publishAt > new Date() && !isAdmin) return notFound();
  if (news.isDraft && !isAdmin && !isMember) return notFound();

  await trackArticleView('news', news.id);

  const relatedByTags = news.tags.length
    ? await prisma.newsPost.findMany({
        where: { id: { not: news.id }, tags: { hasSome: news.tags }, isDraft: false, OR: [{ publishAt: null }, { publishAt: { lte: new Date() } }] },
        orderBy: { createdAt: 'desc' },
        take: 4,
        select: { id: true, title: true, slug: true, coverImage: true, summary: true }
      })
    : [];

  return (
    <div className="pt-6 max-w-2xl">
      <script
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
      <div className="flex items-center gap-2 text-sm text-muted mb-5">
        <Link href="/" className="hover:text-accent">Domov</Link>
        <span>/</span>
        <span className="text-ink">Novinky</span>
      </div>

      {news.isDraft && (
        <div className="flex items-center gap-2 mb-5 text-xs font-semibold text-accent bg-surface border border-accent/40 rounded-full px-3 py-1.5 w-fit">
          <img src="/golden-ticket-badge.svg" alt="" width={16} height={16} />
          {isAdmin ? '📝 Rozpísané — vidíš to ako administrátor' : 'Skorý prístup vďaka Golden Ticket členstvu — tento článok ešte nie je verejne publikovaný'}
        </div>
      )}

      <span className="inline-block bg-night text-white text-xs font-semibold px-3 py-1.5 rounded-full mb-4">
        Novinka
      </span>

      <h1 className="font-display font-extrabold text-3xl sm:text-4xl leading-tight text-ink mb-4">{news.title}</h1>

      <div className="flex items-center gap-5 text-sm text-muted mb-6 flex-wrap">
        <Link href={`/profile/${news.author.id}`} className="flex items-center gap-2 hover:text-accent">
          {news.author.avatar ? (
            <img src={news.author.avatar} alt={news.author.name} className="w-6 h-6 rounded-full object-cover" />
          ) : (
            <IconUser className="w-4 h-4" />
          )}
          {news.author.name}
        </Link>
        <span className="flex items-center gap-1.5"><IconClock className="w-4 h-4" />
          {new Date(news.createdAt).toLocaleDateString('sk-SK', { day: 'numeric', month: 'long', year: 'numeric' })}
        </span>
        <span className="flex items-center gap-1.5"><IconBook className="w-4 h-4" />{readingTime(news.body)} min čítania</span>
      </div>

      {news.coverImage && (
        <img src={news.coverImage} alt={news.title} className="w-full max-h-[420px] object-cover rounded-xl mb-8 bg-surface" />
      )}

      <div
        className="article-body text-lg leading-relaxed text-ink font-body mb-6"
        dangerouslySetInnerHTML={{ __html: mdToHtml(news.body) }}
      />

      {news.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-8">
          {news.tags.map((tag) => (
            <Link
              key={tag}
              href={`/novinky?tag=${encodeURIComponent(tag)}`}
              className="text-xs font-semibold text-accent bg-surface border border-accent/40 px-2.5 py-1 rounded-full hover:bg-accent hover:text-white transition-colors"
            >
              #{tag}
            </Link>
          ))}
        </div>
      )}

      {relatedByTags.length > 0 && (
        <div className="mb-10">
          <h2 className="font-display font-bold text-lg text-ink mb-3">Súvisiace články</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {relatedByTags.map((r) => (
              <Link key={r.id} href={`/news/${r.slug}`} className="flex gap-3 border border-line rounded-xl p-3 hover:border-accent transition-colors">
                <div className="w-14 h-14 rounded-lg bg-surface bg-cover bg-center flex-none" style={r.coverImage ? { backgroundImage: `url('${r.coverImage}')` } : undefined} />
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-ink line-clamp-2">{r.title}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {news.author.id !== viewerId && (
        <ReactionButtons
          target={{ newsId: news.id }}
          initialMyValue={news.likes.find((l) => l.userId === viewerId)?.value || 0}
          initialLikeCount={news.likes.filter((l) => l.value === 1).length}
          initialDislikeCount={news.likes.filter((l) => l.value === -1).length}
        />
      )}

      <div className="mt-10 pt-8 border-t border-line">
        <h3 className="font-display font-bold text-lg text-ink mb-5">
          Komentáre {news.comments.length > 0 && `(${news.comments.reduce((n, c) => n + 1 + c.replies.length, 0)})`}
        </h3>

        <div className="space-y-0 mb-6">
          {news.comments.length === 0 ? (
            <p className="text-muted text-sm mb-4">Zatiaľ žiadne komentáre. Buď prvý.</p>
          ) : (
            news.comments.map((c) => (
              <CommentItem
                key={c.id}
                comment={{
                  ...c,
                  createdAt: c.createdAt.toISOString(),
                  replies: c.replies.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() }))
                }}
                target={{ newsId: news.id }}
                viewerId={viewerId}
                isAdmin={isAdmin}
              />
            ))
          )}
        </div>

        <CommentForm target={{ newsId: news.id }} />
      </div>
    </div>
  );
}
