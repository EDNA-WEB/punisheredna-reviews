'use client';

import { useState } from 'react';
import { useT } from './TranslationProvider';

export default function ContactForm({ nickname }: { nickname: string }) {
  const t = useT();
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Odoslanie zlyhalo.');
      setSent(true);
      setBody('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="border border-line rounded-xl bg-card p-5 text-center">
        <p className="font-display font-bold text-sm text-ink mb-1">{t('contact.odoslana_nadpis')}</p>
        <p className="text-xs text-muted">{t('contact.odoslana_popis')}</p>
        <button onClick={() => setSent(false)} className="mt-3 text-xs text-accent font-semibold hover:underline">
          {t('contact.dalsia_sprava')}
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="border border-line rounded-xl overflow-hidden bg-card">
      <div className="bg-surface px-4 py-2.5 border-b border-line">
        <h1 className="font-display font-bold text-sm text-ink">{t('contact.nadpis')}</h1>
      </div>
      <div className="p-4 space-y-3">
        <div>
          <label className="block text-xs font-semibold text-ink mb-1">{t('contact.prezyvka')}</label>
          <input className="field-input-sm bg-surface" value={nickname} disabled />
        </div>
        <div>
          <label className="block text-xs font-semibold text-ink mb-1">{t('contact.obsah_spravy')}</label>
          <textarea
            className="field-input-sm min-h-[90px]"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={t('contact.placeholder')}
            maxLength={3000}
            required
          />
        </div>
        {error && <div className="text-danger text-xs">{error}</div>}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="bg-accent text-white px-5 py-2 rounded-full text-xs font-semibold hover:bg-accent-dark disabled:opacity-50"
          >
            {loading ? t('contact.odosielam') : t('contact.poslat')}
          </button>
        </div>
      </div>
    </form>
  );
}
