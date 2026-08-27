'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function MovieNowShowingToggle({ id, nowShowing }: { id: string; nowShowing: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function toggle() {
    setLoading(true);
    try {
      const res = await fetch(`/api/movies/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nowShowing: !nowShowing })
      });
      if (!res.ok) throw new Error();
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
      className={`text-xs font-semibold px-3 py-1.5 rounded-full border disabled:opacity-50 flex-none ${
        nowShowing ? 'bg-accent text-white border-accent' : 'text-muted border-line hover:border-accent hover:text-accent'
      }`}
    >
      {nowShowing ? 'V kinách ✓' : 'Zaradiť do kín'}
    </button>
  );
}
