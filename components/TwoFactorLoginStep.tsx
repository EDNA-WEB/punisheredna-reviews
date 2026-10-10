'use client';

import { useEffect, useRef, useState } from 'react';
import { useT } from '@/components/TranslationProvider';
import { IconLock } from '@/components/Icons';

// Druhý krok prihlásenia (dvojfaktorové overenie) — rovnaká tmavá karta ako
// prihlásenie. 6 políčok pre kód z aplikácie, alebo záložný kód.
export default function TwoFactorLoginStep({
  onSubmit,
  onBack
}: {
  onSubmit: (code: string) => Promise<string | null>; // vráti chybovú hlášku alebo null
  onBack: () => void;
}) {
  const t = useT();
  const [backupMode, setBackupMode] = useState(false);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const sending = useRef(false);

  useEffect(() => {
    inputRef.current?.focus();
  }, [backupMode]);

  async function send(value: string) {
    if (sending.current) return; // automatické odoslanie + Enter nesmú poslať kód dvakrát
    sending.current = true;
    setLoading(true);
    setError('');
    let err: string | null = null;
    try {
      err = await onSubmit(value);
    } catch {
      err = t('auth.chyba_nespravne_udaje');
    }
    if (err) {
      setError(err);
      setCode('');
      setLoading(false);
      sending.current = false;
      inputRef.current?.focus();
    }
  }

  function changeDigits(v: string) {
    const digits = v.replace(/\D/g, '').slice(0, 6);
    setCode(digits);
    if (digits.length === 6) send(digits);
  }

  return (
    <div className="p-8 max-w-md mx-auto">
      <div className="flex items-center gap-2.5 mb-2">
        <IconLock className="w-5 h-5 text-accent flex-none" />
        <h1 className="font-display font-bold text-xl text-white">{t('2fa.nadpis', 'Dvoufázové ověření')}</h1>
      </div>
      <p className="text-sm text-white/70 leading-relaxed">
        {backupMode
          ? t('2fa.zadaj_zalozny', 'Zadej jeden ze záložních kódů, které sis uložil při zapnutí ověření.')
          : t('2fa.zadaj_kod', 'Zadej 6místný kód z ověřovací aplikace (Google Authenticator, Microsoft Authenticator…).')}
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (code) send(code);
        }}
        className="mt-4"
      >
        {backupMode ? (
          <input
            ref={inputRef}
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 12))}
            placeholder="XXXX-XXXX"
            autoComplete="off"
            spellCheck={false}
            className="w-full bg-black/35 border border-white/15 rounded px-3.5 py-3 text-white font-mono tracking-widest text-lg focus:outline-none focus:border-accent"
          />
        ) : (
          <label className="relative block cursor-text">
            <div className="flex gap-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className={`w-12 h-14 rounded-md bg-black/35 border flex items-center justify-center text-2xl font-semibold text-white ${
                    i === Math.min(code.length, 5) && !loading ? 'border-accent' : 'border-white/15'
                  }`}
                >
                  {code[i] || ''}
                </div>
              ))}
            </div>
            <input
              ref={inputRef}
              value={code}
              onChange={(e) => changeDigits(e.target.value)}
              inputMode="numeric"
              autoComplete="one-time-code"
              aria-label={t('2fa.kod_z_aplikacie', 'Kód z aplikace')}
              className="absolute inset-0 w-full h-full opacity-0"
            />
          </label>
        )}

        {error && <div className="text-red-400 text-sm mt-3">{error}</div>}

        <button
          type="submit"
          disabled={loading || !code}
          className="w-full bg-accent text-white py-2.5 rounded text-sm font-semibold hover:bg-accent-dark disabled:opacity-50 transition-colors mt-4"
        >
          {loading ? t('auth.prihlasujem') : t('2fa.overit', 'Ověřit a přihlásit')}
        </button>
      </form>

      <div className="flex items-center justify-between mt-4 text-sm">
        <button
          type="button"
          onClick={() => {
            setBackupMode((v) => !v);
            setCode('');
            setError('');
          }}
          className="text-accent font-semibold hover:underline"
        >
          {backupMode ? t('2fa.pouzit_aplikaciu', 'Použít kód z aplikace') : t('2fa.pouzit_zalozny', 'Použít záložní kód')}
        </button>
        <button type="button" onClick={onBack} className="text-white/55 hover:text-white">
          {t('2fa.spat', 'Zpět na přihlášení')}
        </button>
      </div>
    </div>
  );
}
