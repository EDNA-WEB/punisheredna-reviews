'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import Link from 'next/link';
import { useT } from '@/components/TranslationProvider';

export default function LoginPage() {
  const t = useT();
  const [nickname, setNickname] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
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
    if (res?.error) {
      setError('Nesprávna prezývka alebo heslo.');
      return;
    }
    window.location.href = '/';
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
          <input
            type="password"
            className="field-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        {error && <div className="text-danger text-sm">{error}</div>}
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
