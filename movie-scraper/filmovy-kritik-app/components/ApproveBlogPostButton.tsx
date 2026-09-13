'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ApproveBlogPostButton({ postId }: { postId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function approve() {
    if (!confirm('Schváliť tento článok a automaticky ho zverejniť na hlavnej stránke?')) return;
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
      <p className="text-sm text-ink font-semibold mb-2">Tento používateľ požiadal o publikáciu na hlavnej stránke.</p>
      <button
        onClick={approve}
        disabled={loading}
        className="bg-accent text-white px-5 py-2 rounded-full text-sm font-semibold hover:bg-accent-dark disabled:opacity-50"
      >
        {loading ? 'Schvaľujem…' : 'Schváliť a zverejniť'}
      </button>
      {error && <div className="text-danger text-xs mt-2">{error}</div>}
    </div>
  );
}
