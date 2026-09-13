'use client';

import { useState } from 'react';
import CommentItem from './CommentItem';
import CommentForm from './CommentForm';
import MovieDiscussionFollowButton from './MovieDiscussionFollowButton';
import { useT } from './TranslationProvider';

export default function MovieDiscussionSection({
  movieId,
  comments,
  viewerId,
  isAdmin,
  isFollowing
}: {
  movieId: string;
  comments: any[];
  viewerId?: string;
  isAdmin: boolean;
  isFollowing: boolean;
}) {
  const [showForm, setShowForm] = useState(false);
  const t = useT();

  return (
    <div>
      <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
        <h3 className="font-display font-bold text-xl text-ink">{t('movie.diskusia')}</h3>
        <div className="flex items-center gap-2 flex-wrap">
          <MovieDiscussionFollowButton movieId={movieId} initialFollowing={isFollowing} />
          <button
            onClick={() => setShowForm((s) => !s)}
            className="text-xs font-bold text-white bg-accent px-3.5 py-1.5 rounded-full hover:bg-accent-dark"
          >
            {t('movie.pridat_prispevok')}
          </button>
        </div>
      </div>

      {showForm && (
        <div className="mb-6">
          <CommentForm target={{ movieId }} onDone={() => setShowForm(false)} />
        </div>
      )}

      {comments.length === 0 ? (
        <p className="text-sm text-muted">{t('movie.ziadny_prispevok')}</p>
      ) : (
        <div className="space-y-0">
          {comments.map((c) => (
            <CommentItem key={c.id} comment={c} target={{ movieId }} viewerId={viewerId} isAdmin={isAdmin} />
          ))}
        </div>
      )}
    </div>
  );
}
