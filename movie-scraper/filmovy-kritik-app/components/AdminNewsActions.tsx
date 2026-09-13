'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function AdminNewsActions({ id, slug }: { id: string; slug: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    if (!confirm('Naozaj chceš túto novinku natrvalo zmazať?')) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/news/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      alert('Zmazanie zlyhalo. Skús to prosím znova.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-4 text-xs font-semibold flex-none">
      <Link href={`/news/${slug}`} className="text-muted hover:text-accent">Zobraziť</Link>
      <Link href={`/admin/news/${id}/edit`} className="text-muted hover:text-accent">Upraviť</Link>
      <button onClick={handleDelete} disabled={loading} className="text-muted hover:text-danger disabled:opacity-50">
        Zmazať
      </button>
    </div>
  );
}
