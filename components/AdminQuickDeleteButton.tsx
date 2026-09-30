'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { IconTrash } from './Icons';

export default function AdminQuickDeleteButton({ movieId, movieTitle }: { movieId: string; movieTitle: string }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    const confirmed = confirm(`Opravdu natrvalo smazat film "${movieTitle}"? Tuto akci nelze vrátit zpět.`);
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
      alert(err.message || 'Smazání se nezdařilo. Zkus to prosím znovu.');
      setDeleting(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={deleting}
      aria-label="Rychle smazat film (admin)"
      title="Rychle smazat film (admin)"
      className="fixed bottom-6 right-20 z-40 w-12 h-12 rounded-full bg-night text-white shadow-lg border border-white/10 flex items-center justify-center hover:bg-danger transition-colors disabled:opacity-50"
    >
      <IconTrash className="w-5 h-5" />
    </button>
  );
}
