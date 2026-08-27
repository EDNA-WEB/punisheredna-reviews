import { prisma } from '@/lib/prisma';
import { mdToHtml, readingTime, youtubeEmbedUrl } from '@/lib/markdown';
import StarRating from '@/components/StarRating';
import CommentForm from '@/components/CommentForm';
import CommentItem from '@/components/CommentItem';
import ShareButtons from '@/components/ShareButtons';
import CriticBadge from '@/components/CriticBadge';
import { IconUser, IconClock, IconBook } from '@/components/Icons';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function ArticlePage({ params }: { params: { slug: string } }) {
  const session = await getServerSession(authOptions);
  const isAdmin = (session?.user as any)?.role === 'ADMIN';
  const currentUserId = (session?.user as any)?.id;

  const article = await prisma.article.findUnique({
    where: { slug: params.slug },
    include: {
      author: { select: { id: true, name: true, avatar: true } },
      comments: { orderBy: { createdAt: 'asc' }, include: { user: { select: { name: true, role: true, avatar: true } } } }
    }
  });

  if (!article) return notFound();

  return (
    <div className="pt-6">
      <div className="flex items-center gap-2 text-sm text-muted mb-5">
        <Link href="/" className="hover:text-accent">Domov</Link>
        <span>/</span>
        <span className="text-ink">Recenzie</span>
      </div>

      <span className="inline-block bg-accent text-white text-xs font-semibold px-3 py-1.5 rounded-full mb-4">
        Recenzia
      </span>

      <h1 className="font-display font-extrabold text-3xl sm:text-4xl leading-tight text-ink mb-4">{article.title}</h1>

      <div className="flex items-center gap-5 text-sm text-muted mb-6 flex-wrap">
        <Link href={`/profile/${article.author.id}`} className="flex items-center gap-2 hover:text-accent">
          {article.author.avatar ? (
            <img src={article.author.avatar} alt={article.author.name} className="w-6 h-6 rounded-full object-cover" />
          ) : (
            <IconUser className="w-4 h-4" />
          )}
          {article.author.name}
        </Link>
        <CriticBadge size="w-4 h-4" />
        <span className="flex items-center gap-1.5"><IconClock className="w-4 h-4" />
          {new Date(article.createdAt).toLocaleDateString('sk-SK', { day: 'numeric', month: 'long', year: 'numeric' })}
        </span>
        <span className="flex items-center gap-1.5"><IconBook className="w-4 h-4" />{readingTime(article.body)} min čítania</span>
      </div>

      {article.coverImage && (
        <div className="relative rounded-2xl overflow-hidden mb-3">
          <img src={article.coverImage} alt={article.title} className="w-full max-h-[440px] object-cover bg-surface" />
          {article.coverCredit && (
            <span className="absolute bottom-3 left-3 bg-black/70 text-white text-xs px-3 py-1.5 rounded-md">
              {article.coverCredit}
            </span>
          )}
        </div>
      )}

      <div className="flex items-center gap-3 text-sm mb-8">
        <StarRating rating={article.rating} size="w-5 h-5" />
        {article.year && <span className="text-muted">· {article.year}</span>}
        {article.genre && <span className="text-muted">· {article.genre}</span>}
        {article.director && <span className="text-muted">· réžia: {article.director}</span>}
      </div>

      {article.trailerUrl && youtubeEmbedUrl(article.trailerUrl) && (
        <div className="mb-8">
          <h3 className="font-display font-bold text-lg text-ink mb-3">Trailer</h3>
          <div className="relative rounded-2xl overflow-hidden bg-surface aspect-video">
            <iframe
              src={youtubeEmbedUrl(article.trailerUrl)!}
              title={`Trailer — ${article.title}`}
              className="absolute inset-0 w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>
      )}

      <div
        className="article-body text-lg leading-relaxed text-[#2b2d31] font-body"
        dangerouslySetInnerHTML={{ __html: mdToHtml(article.body) }}
      />

      <div className="mt-10">
        <ShareButtons title={article.title} />
      </div>

      <div className="mt-14 pt-8 border-t border-line">
        <h3 className="font-display font-bold text-xl text-ink mb-5">
          Komentáre {article.comments.length > 0 && `(${article.comments.length})`}
        </h3>

        <div className="space-y-5 mb-7">
          {article.comments.length === 0 ? (
            <p className="text-muted text-sm">Zatiaľ žiadne komentáre. Buď prvý.</p>
          ) : (
            article.comments.map((c) => (
              <CommentItem
                key={c.id}
                comment={{ ...c, createdAt: c.createdAt.toISOString() }}
                canDelete={isAdmin || c.userId === currentUserId}
              />
            ))
          )}
        </div>

        <CommentForm articleId={article.id} />
      </div>
    </div>
  );
}
