'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { DEFAULT_COOKIES_TEXT } from '@/lib/privacyDefaults';

export default function CookiesPolicyForm({ initial }: { initial: string | null }) {
  const router = useRouter();
  const [text, setText] = useState(initial || DEFAULT_COOKIES_TEXT);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  async function save() {
    setLoading(true);
    setError('');
    setSaved(false);
    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cookiesPolicyText: text })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Uloženie zlyhalo.');
      setSaved(true);
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-3">
      <textarea
        className="field-input min-h-[320px] text-sm font-mono"
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setSaved(false);
        }}
        maxLength={20000}
      />
      <p className="text-xs text-muted">
        Riadky napísané VEĽKÝMI PÍSMENAMI (napr. "ZÁSADY COOKIES") sa na stránke zobrazia ako nadpisy. Prázdny riadok oddeľuje odseky.
      </p>
      {error && <div className="text-danger text-sm">{error}</div>}
      {saved && !error && <div className="text-emerald-600 text-sm font-semibold">Uložené.</div>}
      <button onClick={save} disabled={loading} className="bg-accent text-white px-6 py-2.5 rounded-full text-sm font-semibold hover:bg-accent-dark disabled:opacity-50">
        {loading ? 'Ukladám…' : 'Uložiť text'}
      </button>
    </div>
  );
}
