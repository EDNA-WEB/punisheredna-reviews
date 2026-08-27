'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import CriticBadge from './CriticBadge';
import ReactionButtons from './ReactionButtons';
import CommentForm from './CommentForm';
import { IconUser, IconReply } from './Icons';
import { useT } from './TranslationProvider';
import { displayUserName } from '@/lib/deletedUser';

type CommentData = {
  id: string;
  body: string;
  createdAt: string;
  userId: string;
  user: { name: string; role: string; avatar?: string | null; membershipUntil?: string | Date | null };
  likes: { userId: string; value: number }[];
  replies?: CommentData[];
};

export default function CommentItem({
  comment,
  target,
  viewerId,
  isAdmin,
  depth = 0
}: {
  comment: CommentData;
  target: { reviewId?: string; newsId?: string; movieId?: string };
  viewerId?: string;
  isAdmin: boolean;
  depth?: number;
}) {
  const router = useRouter();
  const t = useT();
  const [loading, setLoading] = useState(false);
  const [replying, setReplying] = useState(false);

  const canDelete = isAdmin || comment.userId === viewerId;

  async function handleDelete() {
    if (!confirm('Naozaj chceš tento komentár zmazať?')) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/comments/${comment.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      alert('Zmazanie zlyhalo. Skús to prosím znova.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div id={`comment-${comment.id}`} className={`scroll-mt-32 ${depth > 0 ? 'pl-4 sm:pl-6 border-l-2 border-line' : ''}`}>
      <div className="flex gap-3 border-b border-line pb-4 mb-4">
        <Link href={`/profile/${comment.userId}`} className="flex-none">
          {comment.user.avatar ? (
            <img src={comment.user.avatar} alt={comment.user.name} className="w-8 h-8 rounded-full object-cover bg-surface" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-surface flex items-center justify-center">
              <IconUser className="w-4 h-4 text-muted" />
            </div>
          )}
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-3 mb-1.5">
            <div className="flex items-center gap-2 text-xs text-muted">
              <Link href={`/profile/${comment.userId}`} className="text-accent font-semibold hover:underline">
                {displayUserName(comment.user.name, t)}
              </Link>
              {comment.user.role === 'ADMIN' && <CriticBadge size="w-3.5 h-3.5" label={false} />}
              <span>{new Date(comment.createdAt).toLocaleDateString('sk-SK')}</span>
            </div>
            {canDelete && (
              <button onClick={handleDelete} disabled={loading} className="text-xs text-muted hover:text-danger disabled:opacity-50">
                Zmazať
              </button>
            )}
          </div>
          <p className="text-[15px] text-ink whitespace-pre-wrap mb-2">{comment.body}</p>
          <div className="flex items-center gap-3">
            {comment.userId !== viewerId && (
              <ReactionButtons
                target={{ commentId: comment.id }}
                initialMyValue={comment.likes.find((l) => l.userId === viewerId)?.value || 0}
                initialLikeCount={comment.likes.filter((l) => l.value === 1).length}
                initialDislikeCount={comment.likes.filter((l) => l.value === -1).length}
              />
            )}
            {depth === 0 && (
              <button
                onClick={() => setReplying((r) => !r)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-accent"
              >
                <IconReply className="w-3.5 h-3.5" />
                Odpovedať
              </button>
            )}
          </div>

          {replying && (
            <div className="mt-3">
              <CommentForm target={target} parentId={comment.id} autoFocus compact onDone={() => setReplying(false)} />
            </div>
          )}
        </div>
      </div>

      {comment.replies && comment.replies.length > 0 && (
        <div className="space-y-0 mb-4">
          {comment.replies.map((r) => (
            <CommentItem key={r.id} comment={r} target={target} viewerId={viewerId} isAdmin={isAdmin} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}
