'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function AdminMovieActions({ id, slug }: { id: string; slug: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    if (!confirm('Naozaj chceš tento film natrvalo zmazať? Zmažú sa aj všetky jeho recenzie a hodnotenia.')) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/movies/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      alert('Zmazanie zlyhalo.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-4 text-xs font-semibold flex-none">
      <Link href={`/movie/${slug}`} className="text-muted hover:text-accent">Zobraziť</Link>
      <Link href={`/admin/movies/${id}/edit`} className="text-muted hover:text-accent">Upraviť</Link>
      <button onClick={handleDelete} disabled={loading} className="text-muted hover:text-danger disabled:opacity-50">Zmazať</button>
    </div>
  );
}
