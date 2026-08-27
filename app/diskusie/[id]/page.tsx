import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { IconUser } from '@/components/Icons';
import CriticBadge from '@/components/CriticBadge';
import GoldenTicketBadge from '@/components/GoldenTicketBadge';
import PostItem from '@/components/PostItem';
import PostForm from '@/components/PostForm';

export const dynamic = 'force-dynamic';

export default async function ThreadPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const viewerId = (session?.user as any)?.id;
  const isAdmin = (session?.user as any)?.role === 'ADMIN';

  const thread = await prisma.thread.findUnique({
    where: { id: params.id },
    include: {
      author: { select: { id: true, name: true, avatar: true, role: true, membershipUntil: true } },
      movie: { select: { title: true, slug: true } },
      posts: { orderBy: { createdAt: 'asc' }, include: { author: { select: { name: true, avatar: true, role: true, membershipUntil: true } }, likes: true } }
    }
  });

  if (!thread) return notFound();

  return (
    <div className="pt-6 max-w-2xl">
      <Link href="/diskusie" className="text-sm text-muted hover:text-accent inline-block mb-5">← Späť na diskusie</Link>

      {thread.movie && (
        <Link href={`/movie/${thread.movie.slug}`} className="inline-block text-xs font-semibold text-accent bg-accent/10 px-2.5 py-1 rounded-full mb-3 hover:underline">
          o filme {thread.movie.title}
        </Link>
      )}

      <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-ink mb-3">{thread.title}</h1>

      <div className="flex items-center gap-2 text-sm text-muted mb-6">
        <Link href={`/profile/${thread.author.id}`} className="flex items-center gap-2 hover:text-accent">
          {thread.author.avatar ? (
            <img src={thread.author.avatar} alt={thread.author.name} className="w-6 h-6 rounded-full object-cover" />
          ) : (
            <IconUser className="w-4 h-4" />
          )}
          {thread.author.name}
        </Link>
        {thread.author.role === 'ADMIN' && <CriticBadge size="w-4 h-4" label={false} />}
        {thread.author.membershipUntil && thread.author.membershipUntil > new Date() && <GoldenTicketBadge size={16} />}
        <span>· {new Date(thread.createdAt).toLocaleDateString('sk-SK')}</span>
      </div>

      <p className="text-[16px] text-ink leading-relaxed whitespace-pre-wrap mb-10">{thread.body}</p>

      <h3 className="font-display font-bold text-lg text-ink mb-5">
        Odpovede {thread.posts.length > 0 && `(${thread.posts.length})`}
      </h3>

      <div className="space-y-5 mb-7">
        {thread.posts.length === 0 ? (
          <p className="text-sm text-muted">Zatiaľ žiadne odpovede. Buď prvý.</p>
        ) : (
          thread.posts.map((p) => (
            <PostItem
              key={p.id}
              post={{ ...p, createdAt: p.createdAt.toISOString() }}
              canDelete={isAdmin || p.authorId === viewerId}
              viewerId={viewerId}
              myValue={p.likes.find((l) => l.userId === viewerId)?.value || 0}
              likeCount={p.likes.filter((l) => l.value === 1).length}
              dislikeCount={p.likes.filter((l) => l.value === -1).length}
            />
          ))
        )}
      </div>

      <PostForm threadId={thread.id} />
    </div>
  );
}
