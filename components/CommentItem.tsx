'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import CriticBadge from './CriticBadge';
import ReactionButtons from './ReactionButtons';
import CommentReactions from './CommentReactions';
import CommentForm from './CommentForm';
import { IconUser, IconReply } from './Icons';
import { useT } from './TranslationProvider';
import { displayUserName } from '@/lib/deletedUser';

type CommentData = {
  id: string;
  body: string;
  createdAt: string;
  updatedAt?: string;
  userId: string;
  user: { name: string; role: string; avatar?: string | null; membershipUntil?: string | Date | null };
  likes: { userId: string; value: number }[];
  reactions?: { emoji: string; count: number }[];
  myReaction?: string | null;
  replies?: CommentData[];
};

export default function CommentItem({
  comment,
  target,
  viewerId,
  isAdmin,
  isMember = false,
  depth = 0
}: {
  comment: CommentData;
  target: { reviewId?: string; newsId?: string; movieId?: string };
  viewerId?: string;
  isAdmin: boolean;
  isMember?: boolean;
  depth?: number;
}) {
  const router = useRouter();
  const t = useT();
  const [loading, setLoading] = useState(false);
  const [replying, setReplying] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editBody, setEditBody] = useState(comment.body);
  const [currentBody, setCurrentBody] = useState(comment.body);
  const [editError, setEditError] = useState('');

  const isOwner = comment.userId === viewerId;
  const canDelete = isAdmin || (isOwner && isMember);
  const wasEdited = comment.updatedAt && new Date(comment.updatedAt).getTime() - new Date(comment.createdAt).getTime() > 60_000;

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

  async function handleSaveEdit() {
    const trimmed = editBody.trim();
    if (!trimmed) {
      setEditError('Komentár nemôže byť prázdny.');
      return;
    }
    setLoading(true);
    setEditError('');
    try {
      const res = await fetch(`/api/comments/${comment.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: trimmed })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Úprava zlyhala.');
      setCurrentBody(data.body);
      setEditing(false);
      router.refresh();
    } catch (err: any) {
      setEditError(err.message || 'Úprava zlyhala.');
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
              {wasEdited && <span className="italic">(upravené)</span>}
            </div>
            {canDelete && !editing && (
              <div className="flex items-center gap-2">
                <button onClick={() => { setEditing(true); setEditBody(currentBody); }} className="text-xs text-muted hover:text-accent">
                  Upraviť
                </button>
                <button onClick={handleDelete} disabled={loading} className="text-xs text-muted hover:text-danger disabled:opacity-50">
                  Zmazať
                </button>
              </div>
            )}
          </div>
          {editing ? (
            <div className="mb-2">
              <textarea
                value={editBody}
                onChange={(e) => setEditBody(e.target.value)}
                rows={3}
                maxLength={2000}
                className="w-full border border-line rounded-lg px-3 py-2 text-sm mb-2"
              />
              {editError && <p className="text-danger text-xs mb-2">{editError}</p>}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSaveEdit}
                  disabled={loading}
                  className="bg-accent text-white text-xs font-semibold px-3 py-1.5 rounded-full hover:bg-accent-dark disabled:opacity-50"
                >
                  {loading ? 'Ukladám…' : 'Uložiť'}
                </button>
                <button
                  onClick={() => { setEditing(false); setEditError(''); }}
                  className="text-xs font-semibold text-muted hover:text-ink"
                >
                  Zrušiť
                </button>
              </div>
            </div>
          ) : (
            <p className="text-[15px] text-ink whitespace-pre-wrap mb-2">{currentBody}</p>
          )}
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
          <CommentReactions
            commentId={comment.id}
            initialReactions={comment.reactions || []}
            myReaction={comment.myReaction || null}
            isMember={isMember}
          />

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
            <CommentItem key={r.id} comment={r} target={target} viewerId={viewerId} isAdmin={isAdmin} isMember={isMember} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}
