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
    <div className="rounded-xl p-4 mb-4 text-center" style={{ backgroundColor: '#202c33' }}>
      <p className="text-sm text-[#e9edef] mb-3">
        <strong>{otherName}</strong> ti chce napísať. Chceš s ňou/ním komunikovať?
      </p>
      <div className="flex items-center justify-center gap-2">
        <button
          type="button"
          onClick={() => respond('accept')}
          disabled={loading !== null}
          className="bg-[#00a884] text-white text-sm font-semibold px-5 py-2 rounded-full hover:bg-[#029271] disabled:opacity-50"
        >
          {loading === 'accept' ? 'Prijímam…' : 'Prijať'}
        </button>
        <button
          type="button"
          onClick={() => respond('decline')}
          disabled={loading !== null}
          className="border border-[#3b4a54] text-[#e9edef] text-sm font-semibold px-5 py-2 rounded-full hover:border-[#f15c6d] hover:text-[#f15c6d] disabled:opacity-50"
        >
          {loading === 'decline' ? 'Zamietam…' : 'Zamietnuť'}
        </button>
      </div>
      {error && <p className="text-[#f15c6d] text-xs mt-2">{error}</p>}
    </div>
  );
}
