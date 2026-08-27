'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminPremiereActions({ id }: { id: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    if (!confirm('Zmazať túto premiéru zo zoznamu?')) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/premieres/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      alert('Zmazanie zlyhalo.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <button onClick={handleDelete} disabled={loading} className="text-xs font-semibold text-muted hover:text-danger disabled:opacity-50">
      Zmazať
    </button>
  );
}
