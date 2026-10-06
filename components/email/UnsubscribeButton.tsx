'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useT } from '@/components/TranslationProvider';
import { primaryButton } from './authStyles';

// Potvrdenie odhlásenia odberu (tlačidlo, nie automaticky pri otvorení —
// niektoré poštové služby odkazy v e-mailoch samy „otvárajú“ pri kontrole).
export default function UnsubscribeButton({ query }: { query: string }) {
  const t = useT();
  const [state, setState] = useState<'idle' | 'busy' | 'done' | 'error'>('idle');

  async function go() {
    setState('busy');
    try {
      const res = await fetch(`/api/email/unsubscribe?${query}`, { method: 'POST' });
      setState(res.ok ? 'done' : 'error');
    } catch {
      setState('error');
    }
  }

  if (state === 'done') {
    return (
      <div className="mt-5">
        <p className="text-emerald-400 font-semibold">{t('unsub.hotovo', 'Hotovo, tyto e-maily ti už chodit nebudou.')}</p>
        <Link href="/nastavenia/notifikacie" className="text-accent text-xs font-semibold hover:underline inline-block mt-4">
          {t('unsub.nastavenia', 'Nastavení oznámení')}
        </Link>
      </div>
    );
  }
  return (
    <div className="mt-6">
      <button type="button" onClick={go} disabled={state === 'busy'} className={primaryButton}>
        {t('unsub.potvrdit', 'Odhlásit odběr')}
      </button>
      {state === 'error' && <p className="text-red-400 text-xs mt-2">{t('unsub.chyba', 'Odkaz je neplatný. Odběr můžeš vypnout v Nastavení → Oznámení.')}</p>}
    </div>
  );
}
