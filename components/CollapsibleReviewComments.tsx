'use client';

import { useState } from 'react';
import CommentItem from './CommentItem';
import CommentForm from './CommentForm';
import { IconComment } from './Icons';

type CommentData = any;

export default function CollapsibleReviewComments({
  reviewId,
  comments,
  totalCount,
  viewerId,
  isAdmin
}: {
  reviewId: string;
  comments: CommentData[];
  totalCount: number;
  viewerId?: string;
  isAdmin: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-accent transition-colors"
      >
        <IconComment className="w-4 h-4" />
        {totalCount > 0 ? `Komentáre (${totalCount})` : 'Pridať komentár'}
      </button>

      {open && (
        <div className="pl-2 border-l-2 border-line mt-4">
          <div className="space-y-0 mb-5">
            {comments.map((c) => (
              <CommentItem
                key={c.id}
                comment={c}
                target={{ reviewId }}
                viewerId={viewerId}
                isAdmin={isAdmin}
              />
            ))}
          </div>
          <CommentForm target={{ reviewId }} />
        </div>
      )}
    </div>
  );
}
