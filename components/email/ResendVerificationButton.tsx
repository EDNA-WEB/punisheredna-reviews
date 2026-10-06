'use client';

import { useEffect, useState } from 'react';
import { useT } from '@/components/TranslationProvider';
import { primaryButton, secondaryButton } from './authStyles';

// Opätovné poslanie overovacieho e-mailu (podľa prezývky alebo starého tokenu),
// s odpočtom 60 s.
export default function ResendVerificationButton({ nickname, token, primary = false, initialWait = 60 }: { nickname?: string; token?: string; primary?: boolean; initialWait?: number }) {
  const t = useT();
  const [wait, setWait] = useState(initialWait);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (wait <= 0) return;
    const id = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(id);
  }, [wait]);

  async function resend() {
    setBusy(true);
    setError('');
    setSent(false);
    try {
      const res = await fetch('/api/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(token ? { token } : { nickname })
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 429) {
        setWait(data.retryIn || 60);
        return;
      }
      if (!res.ok) throw new Error(data.error || '');
      setSent(true);
      setWait(60);
    } catch (e: any) {
      setError(e.message || t('email.chyba_odoslania', 'E-mail se nepodařilo odeslat. Zkus to prosím znovu.'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-6">
      <button type="button" onClick={resend} disabled={busy || wait > 0} className={primary ? primaryButton : secondaryButton}>
        {busy ? t('auth.odosielam_email', 'Odesílám…') : t('email.poslat_odkaz_znova', 'Poslat odkaz znovu')}
      </button>
      <p className="text-xs text-white/50 mt-2 min-h-[1rem]">
        {sent ? <span className="text-emerald-400 font-semibold">{t('email.odkaz_odoslany', 'Nový odkaz je na cestě.')}</span> : null}
        {!sent && wait > 0 ? `${t('email.znova_za', 'Znovu poslat půjde za')} ${wait} s` : null}
      </p>
      {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
    </div>
  );
}
