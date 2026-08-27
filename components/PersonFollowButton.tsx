'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function PersonFollowButton({ personId, initialFollowing }: { personId: string; initialFollowing: boolean }) {
  const router = useRouter();
  const [following, setFollowing] = useState(initialFollowing);
  const [loading, setLoading] = useState(false);

  async function toggle() {
    setLoading(true);
    try {
      const res = await fetch('/api/people/follow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ personId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error();
      setFollowing(data.following);
      router.refresh();
    } catch {
      alert('Akcia zlyhala. Skús to prosím znova.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`text-sm font-semibold px-4 py-2 rounded-full border disabled:opacity-50 ${
        following ? 'bg-surface text-ink border-line hover:border-danger hover:text-danger' : 'bg-accent text-white border-accent hover:bg-accent-dark'
      }`}
    >
      {following ? 'Sledujem ♥' : '+ Sledovať'}
    </button>
  );
}
