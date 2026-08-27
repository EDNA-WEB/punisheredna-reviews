'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { IconEye } from './Icons';

export default function WatchedEyeToggle({ apiBase, initialWatched }: { apiBase: string; initialWatched: boolean }) {
  const router = useRouter();
  const [watched, setWatched] = useState(initialWatched);
  const [loading, setLoading] = useState(false);

  async function toggle() {
    setLoading(true);
    const next = !watched;
    setWatched(next);
    try {
      const res = await fetch(`${apiBase}/watched`, { method: next ? 'POST' : 'DELETE' });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      setWatched(!next);
      alert('Zmena zlyhala. Skús to prosím znova.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={loading}
      title={watched ? 'Označené ako videné — klikni pre zrušenie' : 'Označiť ako videné'}
      aria-label={watched ? 'Označené ako videné' : 'Označiť ako videné'}
      className={`w-9 h-9 rounded-full flex items-center justify-center border transition-colors disabled:opacity-50 ${
        watched ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-card/90 border-line text-ink hover:border-accent hover:text-accent'
      }`}
    >
      <IconEye className="w-4.5 h-4.5" />
    </button>
  );
}
