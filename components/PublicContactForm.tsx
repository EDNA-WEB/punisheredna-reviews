'use client';

import { useState } from 'react';
import CaptchaField from '@/components/CaptchaField';
import { useT } from '@/components/TranslationProvider';

// Kontaktný formulár na stránke /provozovatel — aj pre neprihlásených.
export default function PublicContactForm() {
  const t = useT();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [website, setWebsite] = useState(''); // pasca na boty (skryté pole)
  const [captchaAnswer, setCaptchaAnswer] = useState('');
  const [captchaToken, setCaptchaToken] = useState('');
  const [captchaKey, setCaptchaKey] = useState(0);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/contact/public', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, message, website, captchaToken, captchaAnswer })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || t('operator.chyba', 'Odeslání se nezdařilo.'));
      setSent(true);
    } catch (err: any) {
      setError(err.message);
      setCaptchaKey((k) => k + 1);
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="border border-line rounded-xl bg-surface p-5 text-sm text-ink">
        {t('operator.odoslane', 'Děkujeme, zpráva byla odeslána. Odpovíme na zadaný e-mail.')}
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="pc-name" className="block text-sm font-semibold text-ink mb-1.5">{t('operator.meno', 'Jméno')}</label>
          <input id="pc-name" className="field-input" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
        </div>
        <div>
          <label htmlFor="pc-email" className="block text-sm font-semibold text-ink mb-1.5">{t('operator.email_odpoved', 'E-mail pro odpověď')}</label>
          <input id="pc-email" type="email" className="field-input" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={200} required />
        </div>
      </div>
      <div>
        <label htmlFor="pc-msg" className="block text-sm font-semibold text-ink mb-1.5">{t('operator.sprava', 'Zpráva')}</label>
        <textarea id="pc-msg" className="field-input min-h-[120px]" value={message} onChange={(e) => setMessage(e.target.value)} maxLength={3000} required />
      </div>
      <input type="text" value={website} onChange={(e) => setWebsite(e.target.value)} className="hidden" tabIndex={-1} autoComplete="off" aria-hidden="true" />
      <div className="max-w-sm">
        <CaptchaField key={captchaKey} variant="light" answer={captchaAnswer} onAnswerChange={setCaptchaAnswer} onTokenChange={setCaptchaToken} />
      </div>
      {error && <div className="text-danger text-sm">{error}</div>}
      <button type="submit" disabled={loading} className="bg-night text-white px-6 py-3 rounded-full text-sm font-semibold hover:bg-night/85 disabled:opacity-50">
        {loading ? t('operator.odosielam', 'Odesílám…') : t('operator.odoslat', 'Odeslat')}
      </button>
    </form>
  );
}
