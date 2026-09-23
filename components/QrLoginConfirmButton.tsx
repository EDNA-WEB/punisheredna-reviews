'use client';

import { useState } from 'react';

export default function QrLoginConfirmButton({ id }: { id: string }) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  async function confirm() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/qr-login/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Potvrdenie zlyhalo.');
      setDone(true);
    } catch (err: any) {
      setError(err.message || 'Potvrdenie zlyhalo.');
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return <p className="text-emerald-600 font-semibold text-sm">Hotovo — druhé zariadenie sa teraz prihlási.</p>;
  }

  return (
    <div>
      <button
        type="button"
        onClick={confirm}
        disabled={loading}
        className="bg-accent text-white px-6 py-3 rounded-full text-sm font-semibold hover:bg-accent-dark disabled:opacity-50"
      >
        {loading ? 'Potvrdzujem…' : 'Potvrdiť prihlásenie'}
      </button>
      {error && <p className="text-danger text-sm mt-3">{error}</p>}
    </div>
  );
}
