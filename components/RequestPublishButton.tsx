'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function RequestPublishButton({ postId }: { postId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  async function request() {
    if (!confirm('Poslať administrátorovi žiadosť o zverejnenie tohto článku na hlavnej stránke?')) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/blog/${postId}/request`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Žiadosť zlyhala.');
      setDone(true);
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return <p className="text-sm text-emerald-600 font-semibold">Žiadosť o publikáciu bola odoslaná administrátorovi.</p>;
  }

  return (
    <div>
      <button
        onClick={request}
        disabled={loading}
        className="bg-accent text-white px-5 py-2.5 rounded-full text-sm font-semibold hover:bg-accent-dark disabled:opacity-50"
      >
        {loading ? 'Odosielam…' : 'Požiadať o publikáciu na hlavnej stránke'}
      </button>
      {error && <div className="text-danger text-xs mt-2">{error}</div>}
    </div>
  );
}
