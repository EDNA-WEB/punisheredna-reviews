'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ApprovePersonButton({ id }: { id: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function approve() {
    setLoading(true);
    try {
      const res = await fetch(`/api/people/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approved: true })
      });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      alert('Schválenie zlyhalo.');
    } finally {
      setLoading(false);
    }
  }

  async function reject() {
    if (!confirm('Naozaj chceš tento návrh zamietnuť a zmazať?')) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/people/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      alert('Zamietnutie zlyhalo.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-2 flex-none">
      <button onClick={approve} disabled={loading} className="text-xs font-semibold bg-emerald-600 text-white px-3 py-1.5 rounded-full hover:bg-emerald-700 disabled:opacity-50">
        Schváliť
      </button>
      <button onClick={reject} disabled={loading} className="text-xs font-semibold text-muted hover:text-danger disabled:opacity-50">
        Zamietnuť
      </button>
    </div>
  );
}
