'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

// Administrace → Uživatelé: zrušenie dvojfázového overenia používateľovi, ktorý
// stratil telefón aj záložné kódy. Potvrdenie priamo v riadku.
export default function UserTwoFactorReset({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function reset() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/two-factor-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: id })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Akce se nezdařila.');
      setConfirming(false);
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="text-xs font-semibold px-3.5 py-1.5 rounded-full border text-danger border-danger hover:bg-danger hover:text-white"
      >
        Zrušit 2FA
      </button>
    );
  }

  return (
    <div className="w-full sm:w-[420px] bg-card border border-line rounded-xl p-4 shadow-lg">
      <div className="font-bold text-ink mb-1.5">Zrušit dvoufázové ověření?</div>
      <p className="text-sm text-muted leading-relaxed mb-3">
        Uživatel {name} bude odhlášen ze všech zařízení a dostane e-mail. Použij jen na jeho žádost, když ztratil telefon i záložní kódy. Akce se
        zapíše do audit logu.
      </p>
      {error && <div className="text-danger text-sm mb-2">{error}</div>}
      <div className="flex gap-2">
        <button type="button" onClick={reset} disabled={loading} className="bg-danger text-white text-sm font-semibold px-4 py-2 rounded-md hover:bg-danger-dark disabled:opacity-50">
          {loading ? 'Ruším…' : 'Zrušit ověření'}
        </button>
        <button type="button" onClick={() => setConfirming(false)} className="text-xs font-semibold px-3.5 py-1.5 rounded-full border border-line text-ink">
          Zpět
        </button>
      </div>
    </div>
  );
}
