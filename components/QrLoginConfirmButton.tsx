'use client';

import { useState } from 'react';
import { useT } from './TranslationProvider';

export default function QrLoginConfirmButton({ id }: { id: string }) {
  const t = useT();
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
      if (!res.ok) throw new Error(data.error || t('auth.qr_potvrdenie_zlyhalo'));
      setDone(true);
    } catch (err: any) {
      setError(err.message || t('auth.qr_potvrdenie_zlyhalo'));
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return <p className="text-emerald-600 font-semibold text-sm">{t('auth.qr_hotovo')}</p>;
  }

  return (
    <div>
      <button
        type="button"
        onClick={confirm}
        disabled={loading}
        className="bg-accent text-white px-6 py-3 rounded-full text-sm font-semibold hover:bg-accent-dark disabled:opacity-50"
      >
        {loading ? t('auth.qr_potvrdzujem') : t('auth.qr_potvrdit_prihlasenie')}
      </button>
      {error && <p className="text-danger text-sm mt-3">{error}</p>}
    </div>
  );
}
