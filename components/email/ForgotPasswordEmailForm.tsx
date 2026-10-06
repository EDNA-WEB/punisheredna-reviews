'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useT } from '@/components/TranslationProvider';
import { inputClass, primaryButton } from './authStyles';

export default function ForgotPasswordEmailForm() {
  const t = useT();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await fetch('/api/password-reset/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
    } finally {
      setBusy(false);
      setSent(true);
    }
  }

  if (sent) {
    return (
      <div>
        <p>{t('reset.odoslane', 'Pokud k této adrese existuje účet, poslali jsme na ni odkaz pro nastavení nového hesla. Odkaz platí 1 hodinu.')}</p>
        <p className="text-xs text-white/50 mt-3">{t('email.skontroluj_spam', 'Nic nepřišlo? Podívej se i do složky Spam.')}</p>
        <Link href="/login" className={`${primaryButton} block mt-6`}>
          {t('email.spat_na_prihlasenie', 'Zpět na přihlášení')}
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="text-left">
      <p className="text-center">{t('reset.popis', 'Zadej e-mail, se kterým ses registroval. Pošleme ti odkaz na nastavení nového hesla.')}</p>
      <label className="block text-sm text-white/70 mb-2 mt-5" htmlFor="reset-email">
        {t('auth.email', 'E-mail')}
      </label>
      <input id="reset-email" type="email" required autoComplete="email" className={inputClass} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tvuj@email.cz" />
      <button type="submit" disabled={busy || !email} className={`${primaryButton} mt-5`}>
        {busy ? t('auth.odosielam_email', 'Odesílám…') : t('reset.poslat_odkaz', 'Poslat odkaz')}
      </button>
      <p className="text-xs text-white/50 mt-4 text-center">{t('reset.bezpecnost', 'Z bezpečnostních důvodů nepíšeme, jestli je e-mail u nás registrovaný.')}</p>
      <div className="flex justify-center gap-5 mt-5 text-xs font-semibold">
        <Link href="/zabudnute-heslo" className="text-accent hover:underline">{t('reset.mam_kod', 'Mám bezpečnostní kód')}</Link>
        <Link href="/login" className="text-white/60 hover:text-white">{t('email.spat_na_prihlasenie', 'Zpět na přihlášení')}</Link>
      </div>
    </form>
  );
}
