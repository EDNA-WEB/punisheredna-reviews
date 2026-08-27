'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { IconHeart } from './Icons';

type Target = { reviewId?: string; commentId?: string; postId?: string };

export default function LikeButton({ target, initialLiked, initialCount }: { target: Target; initialLiked: boolean; initialCount: number }) {
  const { data: session } = useSession();
  const router = useRouter();
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [loading, setLoading] = useState(false);

  async function toggle() {
    if (!session) {
      router.push('/login');
      return;
    }
    setLoading(true);
    // optimistické prekreslenie
    setLiked((prev) => !prev);
    setCount((prev) => (liked ? prev - 1 : prev + 1));
    try {
      const res = await fetch('/api/likes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(target)
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setLiked(data.liked);
      setCount(data.count);
      router.refresh();
    } catch {
      // vráť späť pri chybe
      setLiked((prev) => !prev);
      setCount((prev) => (liked ? prev + 1 : prev - 1));
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-full border transition-colors disabled:opacity-60 ${
        liked ? 'text-accent border-accent bg-accent/5' : 'text-muted border-line hover:border-accent hover:text-accent'
      }`}
    >
      <IconHeart className="w-3.5 h-3.5" filled={liked} />
      {count > 0 ? count : 'Páči sa mi'}
    </button>
  );
}
