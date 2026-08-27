'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { IconUser } from './Icons';
import CriticBadge from './CriticBadge';
import GoldenTicketBadge from './GoldenTicketBadge';
import ReactionButtons from './ReactionButtons';

export default function PostItem({
  post,
  canDelete,
  viewerId,
  myValue,
  likeCount,
  dislikeCount
}: {
  post: { id: string; body: string; createdAt: string; authorId: string; author: { name: string; avatar: string | null; role: string; membershipUntil?: string | Date | null } };
  canDelete: boolean;
  viewerId?: string;
  myValue: number;
  likeCount: number;
  dislikeCount: number;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    if (!confirm('Naozaj chceš tento príspevok zmazať?')) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/posts/${post.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      alert('Zmazanie zlyhalo.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex gap-3 border-b border-line pb-4">
      <Link href={`/profile/${post.authorId}`} className="flex-none">
        {post.author.avatar ? (
          <img src={post.author.avatar} alt={post.author.name} className="w-8 h-8 rounded-full object-cover" />
        ) : (
          <div className="w-8 h-8 rounded-full bg-surface flex items-center justify-center">
            <IconUser className="w-4 h-4 text-muted" />
          </div>
        )}
      </Link>
      <div className="flex-1">
        <div className="flex items-center justify-between gap-3 mb-1.5">
          <div className="flex items-center gap-2 text-xs text-muted">
            <Link href={`/profile/${post.authorId}`} className="text-accent font-semibold hover:underline">{post.author.name}</Link>
            {post.author.role === 'ADMIN' && <CriticBadge size="w-3.5 h-3.5" label={false} />}
            {post.author.membershipUntil && new Date(post.author.membershipUntil) > new Date() && <GoldenTicketBadge size={14} />}
            <span>{new Date(post.createdAt).toLocaleDateString('sk-SK')}</span>
          </div>
          {canDelete && (
            <button onClick={handleDelete} disabled={loading} className="text-xs text-muted hover:text-danger disabled:opacity-50">Zmazať</button>
          )}
        </div>
        <p className="text-[15px] text-ink whitespace-pre-wrap mb-2">{post.body}</p>
        {post.authorId !== viewerId && (
          <ReactionButtons
            target={{ postId: post.id }}
            initialMyValue={myValue}
            initialLikeCount={likeCount}
            initialDislikeCount={dislikeCount}
          />
        )}
      </div>
    </div>
  );
}
