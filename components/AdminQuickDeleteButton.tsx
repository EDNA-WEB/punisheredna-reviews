'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { IconTrash } from './Icons';

export default function AdminQuickDeleteButton({ movieId, movieTitle }: { movieId: string; movieTitle: string }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    const confirmed = confirm(`Naozaj natrvalo zmazať film "${movieTitle}"? Táto akcia sa nedá vrátiť späť.`);
    if (!confirmed) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/movies/${movieId}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Zmazanie zlyhalo.');
      }
      router.push('/recenzie');
      router.refresh();
    } catch (err: any) {
      alert(err.message || 'Zmazanie zlyhalo. Skús to prosím znova.');
      setDeleting(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={deleting}
      aria-label="Rýchlo zmazať film (admin)"
      title="Rýchlo zmazať film (admin)"
      className="fixed bottom-6 right-20 z-40 w-12 h-12 rounded-full bg-night text-white shadow-lg border border-white/10 flex items-center justify-center hover:bg-danger transition-colors disabled:opacity-50"
    >
      <IconTrash className="w-5 h-5" />
    </button>
  );
}
