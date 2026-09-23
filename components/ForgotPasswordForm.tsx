'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useT } from './TranslationProvider';

export default function ForgotPasswordForm() {
  const t = useT();
  const [nickname, setNickname] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const checks = [
    { label: 'aspoň 8 znakov', valid: newPassword.length >= 8 },
    { label: 'veľké písmeno', valid: /[A-Z]/.test(newPassword) },
    { label: 'malé písmeno', valid: /[a-z]/.test(newPassword) },
    { label: 'číslicu', valid: /[0-9]/.test(newPassword) }
  ];

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError('Nové heslá sa nezhodujú.');
      return;
    }
    if (checks.some((c) => !c.valid)) {
      setError('Nové heslo nespĺňa všetky požiadavky nižšie.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname, code, newPassword })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Zmena hesla zlyhala.');
      setSuccess(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="border border-white/10 rounded-lg bg-white/10 p-5 text-center">
        <p className="font-display font-bold text-white mb-1">{t('forgot.uspech')}</p>
        <Link href="/login" className="inline-block mt-3 bg-accent text-white px-5 py-2 rounded-full text-sm font-semibold hover:bg-accent-dark">
          {t('forgot.prihlasit_sa_teraz')}
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div>
        <label className="block text-sm text-white/70 mb-2">{t('auth.prezyvka')}</label>
        <input
          className="w-full bg-black/35 border border-white/15 rounded px-3.5 py-2.5 text-white focus:outline-none focus:border-accent transition-colors"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          required
        />
      </div>
      <div>
        <label className="block text-sm text-white/70 mb-2">{t('forgot.kod')}</label>
        <input
          className="w-full bg-black/35 border border-white/15 rounded px-3.5 py-2.5 text-white uppercase tracking-widest focus:outline-none focus:border-accent transition-colors"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          maxLength={8}
          placeholder="napr. A7K9M2XQ"
          required
        />
      </div>
      <div>
        <label className="block text-sm text-white/70 mb-2">{t('forgot.nove_heslo')}</label>
        <input
          type="password"
          className="w-full bg-black/35 border border-white/15 rounded px-3.5 py-2.5 text-white focus:outline-none focus:border-accent transition-colors"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
        />
        <ul className="mt-2 space-y-0.5">
          {checks.map((c) => (
            <li key={c.label} className={`text-xs flex items-center gap-1.5 ${c.valid ? 'text-emerald-400' : 'text-white/45'}`}>
              <span>{c.valid ? '✓' : '·'}</span> {c.label}
            </li>
          ))}
        </ul>
      </div>
      <div>
        <label className="block text-sm text-white/70 mb-2">{t('forgot.zopakuj_heslo')}</label>
        <input
          type="password"
          className="w-full bg-black/35 border border-white/15 rounded px-3.5 py-2.5 text-white focus:outline-none focus:border-accent transition-colors"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
        />
      </div>

      {error && <div className="text-red-400 text-sm">{error}</div>}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-accent text-white py-2.5 rounded text-sm font-semibold hover:bg-accent-dark disabled:opacity-50 transition-colors mt-1"
      >
        {loading ? 'Ukladám…' : t('forgot.nastavit')}
      </button>
    </form>
  );
}
