'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useT } from '@/components/TranslationProvider';
import { IconEye, IconEyeOff, IconLock } from '@/components/Icons';
import QrLoginPanel from '@/components/QrLoginPanel';
import AuthPageBackgroundOverride from '@/components/AuthPageBackgroundOverride';

export default function LoginPage() {
  const t = useT();
  const searchParams = useSearchParams();
  const rawCallbackUrl = searchParams?.get('callbackUrl');
  // Bezpečnostná poistka: "callbackUrl" je hodnota z adresy, čo si vie ktokoľvek
  // sám zostaviť — povolíme presmerovanie len na cestu v RÁMCI tohto webu
  // (začína "/"), nikdy na cudziu doménu (napr. "https://podvodny-web.sk").
  const callbackUrl = rawCallbackUrl && rawCallbackUrl.startsWith('/') && !rawCallbackUrl.startsWith('//') ? rawCallbackUrl : null;
  const wasRedirectedHere = !!callbackUrl;
  const [nickname, setNickname] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
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
    const res = await signIn('credentials', { redirect: false, nickname, password, rememberMe: rememberMe ? 'true' : 'false' });
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
    window.location.href = callbackUrl || '/';
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
    // nech vlastná tapeta webu (Administrácia → Nastavenia) presvitá spoza
    // formulára. Vľavo klasické prihlásenie, vpravo QR kód (zatiaľ len vizuálny
    // náhľad — samotná funkcia prihlásenia cez QR príde v ďalšom kroku).
    <div className="min-h-[80vh] flex items-center justify-center py-10 px-4">
      <AuthPageBackgroundOverride />
      <div className="w-full max-w-2xl bg-black/55 backdrop-blur-md border border-white/10 rounded-lg shadow-2xl overflow-hidden">
        {wasRedirectedHere && (
          <div className="flex items-start gap-3 bg-white/10 border-b border-white/10 p-4">
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

        <div className="grid sm:grid-cols-[1.15fr_1fr]">
          <div className="p-8 flex flex-col justify-center gap-3">
            <form onSubmit={submit} className="space-y-3">
              <div>
                <label className="block text-sm text-white/70 mb-2">{t('auth.prihlaste_sa_pomocou')}</label>
                <input
                  className="w-full bg-black/35 border border-white/15 rounded px-3.5 py-2.5 text-white focus:outline-none focus:border-accent transition-colors"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-white/70 mb-2 mt-2">{t('auth.heslo')}</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="w-full bg-black/35 border border-white/15 rounded px-3.5 py-2.5 pr-10 text-white focus:outline-none focus:border-accent transition-colors"
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

              <label className="flex items-center gap-2 text-sm text-white/75 mt-1 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 accent-accent"
                />
                {t('auth.zapamatat_si_ma')}
              </label>

              {error === 'UNVERIFIED' ? (
                <div className="text-sm bg-white/10 border border-white/10 rounded-lg p-3">
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
                className="w-full bg-accent text-white py-2.5 rounded text-sm font-semibold hover:bg-accent-dark disabled:opacity-50 transition-colors mt-1"
              >
                {loading ? t('auth.prihlasujem') : t('auth.prihlasit')}
              </button>

              <Link href="/zabudnute-heslo" className="block text-xs text-accent hover:underline mt-1">
                {t('auth.pomozte_mi')}
              </Link>
            </form>

            <p className="text-white/60 text-sm mt-2">
              {t('auth.nemas_ucet')}{' '}
              <Link href="/register" className="text-accent font-semibold hover:underline">{t('auth.zaregistrovat')}</Link>
            </p>
          </div>

          <div className="border-t sm:border-t-0 sm:border-l border-white/10 p-8 flex flex-col items-center justify-center text-center gap-3.5">
            <div className="w-32 h-32 flex items-center justify-center">
              <QrLoginPanel />
            </div>
            <p className="text-sm font-semibold text-white">{t('auth.qr_nadpis')}</p>
            <p className="text-xs text-white/55 leading-relaxed">{t('auth.qr_popis')}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
