'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useT } from '@/components/TranslationProvider';
import { IconEye, IconEyeOff, IconLock } from '@/components/Icons';

export default function LoginPage() {
  const t = useT();
  const searchParams = useSearchParams();
  const wasRedirectedHere = !!searchParams.get('callbackUrl');
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
      setError(t('auth.chyba_zablokovany'));
      return;
    }
    if (res?.error === 'LOCKED') {
      setError(t('auth.chyba_zamknuty'));
      return;
    }
    if (res?.error === 'UNVERIFIED') {
      setError('UNVERIFIED');
      return;
    }
    if (res?.error) {
      setError(t('auth.chyba_nespravne_udaje'));
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
    // Steam-štýl: karta je len ČIASTOČNE priehľadná (tmavé pozadie + rozmazanie),
    // nech vlastná tapeta webu (nastavená v Administrácia → Nastavenia) presvitá
    // spoza formulára, namiesto plnej neprehľadnej karty ako inde na webe.
    <div className="min-h-[80vh] flex items-center justify-center py-10 px-4">
      <div className="w-full max-w-md bg-black/55 backdrop-blur-md border border-white/10 rounded-2xl shadow-2xl p-8">
        {wasRedirectedHere && (
          <div className="flex items-start gap-3 bg-white/10 border border-white/10 rounded-xl p-4 mb-6">
            <IconLock className="w-5 h-5 text-accent flex-none mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-white">{t('auth.iba_pre_registrovanych')}</p>
              <p className="text-sm text-white/70 mt-1">
                {t('auth.prihlas_sa_alebo')}{' '}
                <Link href="/register" className="text-accent font-semibold hover:underline">
                  {t('auth.vytvor_ucet_odkaz')}
                </Link>{' '}
                {t('auth.rychle_a_zadarmo')}
              </p>
            </div>
          </div>
        )}
        <h1 className="font-display font-extrabold text-3xl text-white mb-8">{t('auth.prihlasit')}</h1>
        <form onSubmit={submit} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-white/90 mb-2">{t('auth.prezyvka')}</label>
            <input
              className="w-full bg-white/10 border border-white/15 rounded-lg px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:border-accent transition-colors"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-white/90 mb-2">{t('auth.heslo')}</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                className="w-full bg-white/10 border border-white/15 rounded-lg px-4 py-3 pr-10 text-white placeholder-white/40 focus:outline-none focus:border-accent transition-colors"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white"
                aria-label={showPassword ? t('auth.skryt_heslo') : t('auth.zobrazit_heslo')}
                tabIndex={-1}
              >
                {showPassword ? <IconEyeOff className="w-4 h-4" /> : <IconEye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          {error === 'UNVERIFIED' ? (
            <div className="text-sm bg-white/10 border border-white/10 rounded-xl p-3">
              <p className="text-white/90 mb-2">{t('auth.email_neovereny')}</p>
              {resent ? (
                <p className="text-emerald-400 font-semibold">{t('auth.email_znova_odoslany')}</p>
              ) : (
                <button
                  type="button"
                  onClick={resendVerification}
                  disabled={resending}
                  className="text-accent font-semibold hover:underline disabled:opacity-50"
                >
                  {resending ? t('auth.odosielam_email') : t('auth.poslat_znova')}
                </button>
              )}
            </div>
          ) : (
            error && <div className="text-red-400 text-sm">{error}</div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-accent text-white py-3 rounded-full text-sm font-semibold hover:bg-accent-dark disabled:opacity-50 transition-colors"
          >
            {loading ? t('auth.prihlasujem') : t('auth.prihlasit')}
          </button>
        </form>
        <p className="text-white/60 text-sm mt-6">
          {t('auth.nemas_ucet')}{' '}
          <Link href="/register" className="text-accent font-semibold hover:underline">{t('auth.zaregistrovat')}</Link>
        </p>
      </div>
    </div>
  );
}
