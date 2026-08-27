'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { IconThumbUp, IconThumbDown } from './Icons';

type Target = { reviewId?: string; commentId?: string; postId?: string; newsId?: string };

export default function ReactionButtons({
  target,
  initialMyValue,
  initialLikeCount,
  initialDislikeCount
}: {
  target: Target;
  initialMyValue: number;
  initialLikeCount: number;
  initialDislikeCount: number;
}) {
  const { data: session } = useSession();
  const router = useRouter();
  const [myValue, setMyValue] = useState(initialMyValue);
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [dislikeCount, setDislikeCount] = useState(initialDislikeCount);
  const [loading, setLoading] = useState(false);

  async function react(value: 1 | -1) {
    if (!session) {
      router.push('/login');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/likes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...target, value })
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        if (res.status === 429 && data?.error) alert(data.error);
        throw new Error();
      }
      const data = await res.json();
      setMyValue(data.myValue);
      setLikeCount(data.likeCount);
      setDislikeCount(data.dislikeCount);
      router.refresh();
    } catch {
      // chyba už bola prípadne oznámená vyššie
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="inline-flex items-center gap-1.5">
      <button
        onClick={() => react(1)}
        disabled={loading}
        aria-label="Páči sa mi"
        className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-full border transition-colors disabled:opacity-60 ${
          myValue === 1 ? 'text-white bg-emerald-600 border-emerald-600' : 'text-muted border-line hover:border-emerald-600 hover:text-emerald-600'
        }`}
      >
        <IconThumbUp className="w-3.5 h-3.5" filled={myValue === 1} />
        {likeCount > 0 ? likeCount : ''}
      </button>
      <button
        onClick={() => react(-1)}
        disabled={loading}
        aria-label="Nepáči sa mi"
        className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-full border transition-colors disabled:opacity-60 ${
          myValue === -1 ? 'text-white bg-danger border-danger' : 'text-muted border-line hover:border-danger hover:text-danger'
        }`}
      >
        <IconThumbDown className="w-3.5 h-3.5" filled={myValue === -1} />
        {dislikeCount > 0 ? dislikeCount : ''}
      </button>
    </div>
  );
}
