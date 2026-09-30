'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ApproveBlogPostButton({ postId }: { postId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function approve() {
    if (!confirm('Schválit tento článek a automaticky ho zveřejnit na hlavní stránce?')) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/blog/${postId}/approve`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Schválenie zlyhalo.');
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="border border-accent/40 bg-accent/5 rounded-xl p-4">
      <p className="text-sm text-ink font-semibold mb-2">Tento uživatel požádal o publikaci na hlavní stránce.</p>
      <button
        onClick={approve}
        disabled={loading}
        className="bg-accent text-white px-5 py-2 rounded-full text-sm font-semibold hover:bg-accent-dark disabled:opacity-50"
      >
        {loading ? 'Schvaluji…' : 'Schválit a zveřejnit'}
      </button>
      {error && <div className="text-danger text-xs mt-2">{error}</div>}
    </div>
  );
}
