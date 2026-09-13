'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ConversationConsentBanner({ otherId, otherName }: { otherId: string; otherName: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState<'accept' | 'decline' | null>(null);
  const [error, setError] = useState('');

  async function respond(action: 'accept' | 'decline') {
    setLoading(action);
    setError('');
    try {
      const res = await fetch('/api/conversations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ otherId, action })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Akcia zlyhala.');
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="border border-line rounded-xl bg-surface p-4 mb-4 text-center">
      <p className="text-sm text-ink mb-3">
        <strong>{otherName}</strong> ti chce napísať. Chceš s ňou/ním komunikovať?
      </p>
      <div className="flex items-center justify-center gap-2">
        <button
          type="button"
          onClick={() => respond('accept')}
          disabled={loading !== null}
          className="bg-accent text-white text-sm font-semibold px-5 py-2 rounded-full hover:bg-accent-dark disabled:opacity-50"
        >
          {loading === 'accept' ? 'Prijímam…' : 'Prijať'}
        </button>
        <button
          type="button"
          onClick={() => respond('decline')}
          disabled={loading !== null}
          className="border border-line text-ink text-sm font-semibold px-5 py-2 rounded-full hover:border-danger hover:text-danger disabled:opacity-50"
        >
          {loading === 'decline' ? 'Zamietam…' : 'Zamietnuť'}
        </button>
      </div>
      {error && <p className="text-danger text-xs mt-2">{error}</p>}
    </div>
  );
}
