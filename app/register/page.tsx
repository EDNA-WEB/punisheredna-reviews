'use client';

import { useState, useEffect } from 'react';
import { signIn } from 'next-auth/react';
import Link from 'next/link';
import CaptchaField from '@/components/CaptchaField';
import { useT } from '@/components/TranslationProvider';

export default function RegisterPage() {
  const t = useT();
  const [registrationsEnabled, setRegistrationsEnabled] = useState(true);
  const [nickname, setNickname] = useState('');
  const [website, setWebsite] = useState('');
  const [formLoadedAt] = useState(() => Date.now());
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [captchaAnswer, setCaptchaAnswer] = useState('');
  const [captchaToken, setCaptchaToken] = useState('');
  const [captchaKey, setCaptchaKey] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('/api/settings')
      .then((res) => res.json())
      .then((data) => setRegistrationsEnabled(data.registrationsEnabled !== false))
      .catch(() => {});
  }, []);

  const passwordChecks = [
    { label: 'aspoň 8 znakov', valid: password.length >= 8 },
    { label: 'veľké písmeno', valid: /[A-Z]/.test(password) },
    { label: 'malé písmeno', valid: /[a-z]/.test(password) },
    { label: 'číslicu', valid: /[0-9]/.test(password) }
  ];

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (password !== passwordConfirm) {
      setError('Heslá sa nezhodujú.');
      return;
    }
    if (passwordChecks.some((c) => !c.valid)) {
      setError('Heslo nespĺňa všetky požiadavky nižšie.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname, email, password, website, elapsedMs: Date.now() - formLoadedAt, captchaToken, captchaAnswer })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Registrácia zlyhala.');

      const signInRes = await signIn('credentials', { redirect: false, nickname, password });
      if (signInRes?.error) throw new Error('Účet bol vytvorený, ale prihlásenie zlyhalo. Skús sa prihlásiť ručne.');

      window.location.href = '/';
    } catch (err: any) {
      setError(err.message);
      setCaptchaKey((k) => k + 1);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto pt-10">
      <h1 className="font-display font-extrabold text-3xl text-ink mb-8">{t('auth.vytvorit_ucet')}</h1>

      {!registrationsEnabled ? (
        <div className="border border-line rounded-xl bg-surface p-5 text-sm text-muted">
          Registrácie sú momentálne pozastavené. Skús to prosím neskôr. Ak už účet máš, môžeš sa{' '}
          <Link href="/login" className="text-accent font-semibold hover:underline">prihlásiť</Link>.
        </div>
      ) : (
      <form onSubmit={submit} className="space-y-5">
        {/* Honeypot proti botom — pre ľudí neviditeľné, nevypĺňať */}
        <input
          type="text"
          name="website"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          tabIndex={-1}
          autoComplete="off"
          className="absolute left-[-9999px] w-px h-px opacity-0"
          aria-hidden="true"
        />
        <div>
          <label className="block text-sm font-semibold text-ink mb-2">{t('auth.prezyvka')}</label>
          <input
            className="field-input"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="napr. FilmovyFanusik"
            required
          />
          <p className="text-xs text-muted mt-1.5">Touto prezývkou sa budeš prihlasovať — nie e-mailom.</p>
        </div>
        <div>
          <label className="block text-sm font-semibold text-ink mb-2">{t('auth.email')}</label>
          <input type="email" className="field-input" value={email} onChange={(e) => setEmail(e.target.value)} required />
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
          <ul className="mt-2 space-y-0.5">
            {passwordChecks.map((c) => (
              <li key={c.label} className={`text-xs flex items-center gap-1.5 ${c.valid ? 'text-emerald-600' : 'text-muted'}`}>
                <span>{c.valid ? '✓' : '·'}</span> {c.label}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <label className="block text-sm font-semibold text-ink mb-2">{t('auth.zopakuj_heslo')}</label>
          <input
            type="password"
            className="field-input"
            value={passwordConfirm}
            onChange={(e) => setPasswordConfirm(e.target.value)}
            required
          />
        </div>
        <CaptchaField key={captchaKey} answer={captchaAnswer} onAnswerChange={setCaptchaAnswer} onTokenChange={setCaptchaToken} />
        {error && <div className="text-danger text-sm">{error}</div>}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-accent text-white py-3 rounded-full text-sm font-semibold hover:bg-accent-dark disabled:opacity-50"
        >
          {loading ? 'Vytváram účet…' : t('auth.zaregistrovat')}
        </button>
      </form>
      )}
      <p className="text-muted text-sm mt-6">
        {t('auth.uz_mas_ucet')}{' '}
        <Link href="/login" className="text-accent font-semibold hover:underline">Prihlás sa</Link>
      </p>
    </div>
  );
}
