'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { IconHeart } from './Icons';
import { useT } from './TranslationProvider';

export default function MovieDiscussionFollowButton({ movieId, initialFollowing }: { movieId: string; initialFollowing: boolean }) {
  const router = useRouter();
  const [following, setFollowing] = useState(initialFollowing);
  const [loading, setLoading] = useState(false);
  const t = useT();

  async function toggle() {
    setLoading(true);
    try {
      const res = await fetch(`/api/movies/${movieId}/discussion-follow`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setFollowing(data.following);
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`inline-flex items-center gap-1.5 text-xs font-bold px-3.5 py-1.5 rounded-full border transition-colors disabled:opacity-50 ${
        following ? 'bg-night text-white border-night' : 'text-ink border-line hover:border-night'
      }`}
    >
      <IconHeart className="w-3.5 h-3.5" filled={following} />
      {following ? t('movie.sleduje_diskusiu') : t('movie.sledovat_diskusiu')}
    </button>
  );
}
