'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useT } from '@/components/TranslationProvider';
import { inputClass, primaryButton } from './authStyles';

export default function NewPasswordForm({ token }: { token: string }) {
  const t = useT();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const checks = [
    { label: t('email.heslo_8', 'alespoň 8 znaků'), valid: password.length >= 8 },
    { label: t('email.heslo_velke', 'velké písmeno'), valid: /[A-Z]/.test(password) },
    { label: t('email.heslo_male', 'malé písmeno'), valid: /[a-z]/.test(password) },
    { label: t('email.heslo_cislo', 'číslici'), valid: /[0-9]/.test(password) }
  ];

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (password !== confirm) return setError(t('email.hesla_nezhoda', 'Hesla se neshodují.'));
    if (checks.some((c) => !c.valid)) return setError(t('email.heslo_poziadavky', 'Heslo nesplňuje všechny požadavky.'));
    setBusy(true);
    try {
      const res = await fetch('/api/password-reset/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || '');
      setDone(true);
    } catch (e: any) {
      setError(e.message || t('email.heslo_chyba', 'Heslo se nepodařilo uložit.'));
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div>
        <p>{t('reset.hotovo', 'Heslo je změněné. Ze všech zařízení jsme tě odhlásili, přihlas se novým heslem.')}</p>
        <Link href="/login" className={`${primaryButton} block mt-6`}>
          {t('auth.prihlasit', 'Přihlásit se')}
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="text-left">
      <label className="block text-sm text-white/70 mb-2 mt-2" htmlFor="np1">{t('email.nove_heslo', 'Nové heslo')}</label>
      <input id="np1" type="password" autoComplete="new-password" required className={inputClass} value={password} onChange={(e) => setPassword(e.target.value)} />
      <ul className="mt-2 space-y-0.5">
        {checks.map((c) => (
          <li key={c.label} className={`text-xs ${c.valid ? 'text-emerald-400' : 'text-white/45'}`}>· {c.label}</li>
        ))}
      </ul>
      <label className="block text-sm text-white/70 mb-2 mt-4" htmlFor="np2">{t('email.zopakuj_heslo', 'Zopakuj nové heslo')}</label>
      <input id="np2" type="password" autoComplete="new-password" required className={inputClass} value={confirm} onChange={(e) => setConfirm(e.target.value)} />
      {error && <p className="text-red-400 text-sm mt-3">{error}</p>}
      <button type="submit" disabled={busy} className={`${primaryButton} mt-5`}>
        {busy ? t('email.ukladam', 'Ukládám…') : t('email.ulozit_heslo', 'Uložit heslo')}
      </button>
      <p className="text-xs text-white/50 mt-3 text-center">{t('reset.odhlasenie', 'Po uložení tě odhlásíme ze všech zařízení.')}</p>
    </form>
  );
}
