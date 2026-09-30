'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { IconEdit, IconTrash } from './Icons';

export default function ReviewActions({ id, movieSlug, showEdit = true }: { id: string; movieSlug: string; showEdit?: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    if (!confirm('Opravdu chceš tuto recenzi natrvalo smazat?')) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/reviews/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      alert('Smazání se nezdařilo. Zkus to prosím znovu.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-2 mb-6">
      {showEdit && (
        <Link
          href={`/movie/${movieSlug}/upravit/${id}`}
          title="Upravit recenzi"
          aria-label="Upravit recenzi"
          className="w-8 h-8 rounded-full flex items-center justify-center text-muted border border-line hover:text-accent hover:border-accent transition-colors"
        >
          <IconEdit className="w-4 h-4" />
        </Link>
      )}
      <button
        onClick={handleDelete}
        disabled={loading}
        title="Smazat recenzi"
        aria-label="Smazat recenzi"
        className="w-8 h-8 rounded-full flex items-center justify-center text-muted border border-line hover:text-white hover:bg-danger hover:border-danger transition-colors disabled:opacity-50"
      >
        <IconTrash className="w-4 h-4" />
      </button>
    </div>
  );
}
