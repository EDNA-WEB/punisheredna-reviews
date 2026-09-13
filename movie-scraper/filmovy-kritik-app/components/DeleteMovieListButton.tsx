'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { IconTrash } from './Icons';

export default function DeleteMovieListButton({ listId }: { listId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    if (!confirm('Naozaj chceš tento zoznam natrvalo zmazať?')) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/movie-lists/${listId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      router.push('/');
      router.refresh();
    } catch {
      alert('Zmazanie zlyhalo. Skús to prosím znova.');
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className="flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-danger border border-line hover:border-danger rounded-full px-3 py-1.5 disabled:opacity-50"
    >
      <IconTrash className="w-3.5 h-3.5" />
      Zmazať zoznam
    </button>
  );
}
