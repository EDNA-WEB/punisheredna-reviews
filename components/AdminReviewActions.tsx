'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function AdminReviewActions({ id, movieSlug }: { id: string; movieSlug: string }) {
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
    <div className="flex items-center gap-4 text-xs font-semibold flex-none">
      <Link href={`/movie/${movieSlug}`} className="text-muted hover:text-accent">Zobrazit</Link>
      <button onClick={handleDelete} disabled={loading} className="text-muted hover:text-danger disabled:opacity-50">Smazat</button>
    </div>
  );
}
