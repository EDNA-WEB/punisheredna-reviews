'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import Link from 'next/link';
import { useT } from '@/components/TranslationProvider';
import { IconEye, IconEyeOff } from '@/components/Icons';

export default function LoginPage() {
  const t = useT();
  const [nickname, setNickname] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [resent, setResent] = useState(false);
  const [resending, setResending] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResent(false);
    const res = await signIn('credentials', { redirect: false, nickname, password });
    setLoading(false);
    if (res?.error === 'BANNED') {
      setError('Tento účet bol zablokovaný administrátorom.');
      return;
    }
    if (res?.error === 'LOCKED') {
      setError('Príliš veľa nesprávnych pokusov o prihlásenie. Účet je dočasne uzamknutý — skús to znova o 15 minút.');
      return;
    }
    if (res?.error === 'UNVERIFIED') {
      setError('UNVERIFIED');
      return;
    }
    if (res?.error) {
      setError('Nesprávna prezývka alebo heslo.');
      return;
    }
    window.location.href = '/';
  }

  async function resendVerification() {
    setResending(true);
    try {
      await fetch('/api/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname })
      });
      setResent(true);
    } finally {
      setResending(false);
    }
  }

  return (
    <div className="max-w-md mx-auto pt-10">
      <h1 className="font-display font-extrabold text-3xl text-ink mb-8">{t('auth.prihlasit')}</h1>
      <form onSubmit={submit} className="space-y-5">
        <div>
          <label className="block text-sm font-semibold text-ink mb-2">{t('auth.prezyvka')}</label>
          <input className="field-input" value={nickname} onChange={(e) => setNickname(e.target.value)} required />
        </div>
        <div>
          <label className="block text-sm font-semibold text-ink mb-2">{t('auth.heslo')}</label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              className="field-input pr-10"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink"
              aria-label={showPassword ? 'Skryť heslo' : 'Zobraziť heslo'}
              tabIndex={-1}
            >
              {showPassword ? <IconEyeOff className="w-4 h-4" /> : <IconEye className="w-4 h-4" />}
            </button>
          </div>
        </div>
        {error === 'UNVERIFIED' ? (
          <div className="text-sm bg-surface border border-line rounded-xl p-3">
            <p className="text-ink mb-2">Tvoj e-mail ešte nie je overený. Skontroluj si prosím schránku (aj spam) a klikni na odkaz z e-mailu.</p>
            {resent ? (
              <p className="text-emerald-600 font-semibold">Overovací e-mail bol znova odoslaný.</p>
            ) : (
              <button
                type="button"
                onClick={resendVerification}
                disabled={resending}
                className="text-accent font-semibold hover:underline disabled:opacity-50"
              >
                {resending ? 'Odosielam…' : 'Poslať overovací e-mail znova'}
              </button>
            )}
          </div>
        ) : (
          error && <div className="text-danger text-sm">{error}</div>
        )}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-accent text-white py-3 rounded-full text-sm font-semibold hover:bg-accent-dark disabled:opacity-50"
        >
          {loading ? 'Prihlasujem…' : t('auth.prihlasit')}
        </button>
      </form>
      <p className="text-muted text-sm mt-6">
        {t('auth.nemas_ucet')}{' '}
        <Link href="/register" className="text-accent font-semibold hover:underline">Zaregistruj sa</Link>
      </p>
    </div>
  );
}
