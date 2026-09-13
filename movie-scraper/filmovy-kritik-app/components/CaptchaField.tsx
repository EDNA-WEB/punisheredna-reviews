'use client';

import { useState, useEffect, useCallback } from 'react';
import { IconRefresh } from './Icons';

export default function CaptchaField({
  answer,
  onAnswerChange,
  onTokenChange
}: {
  answer: string;
  onAnswerChange: (v: string) => void;
  onTokenChange: (token: string) => void;
}) {
  const [svg, setSvg] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    onAnswerChange('');
    try {
      const res = await fetch('/api/captcha');
      if (!res.ok) throw new Error();
      const data = await res.json();
      setSvg(data.svg);
      onTokenChange(data.token);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div>
      <label className="block text-sm font-semibold text-ink mb-2">Overovací kód z obrázka</label>
      <div className="flex items-center gap-2 mb-2">
        <div className="border border-line rounded-lg overflow-hidden bg-surface flex-none w-[200px] h-[70px] flex items-center justify-center">
          {loading ? (
            <span className="text-xs text-muted">Načítavam…</span>
          ) : error ? (
            <span className="text-xs text-danger px-2 text-center">Nepodarilo sa načítať</span>
          ) : (
            <div dangerouslySetInnerHTML={{ __html: svg }} />
          )}
        </div>
        <button
          type="button"
          onClick={load}
          title="Načítať iný kód"
          aria-label="Načítať iný kód"
          className="w-9 h-9 rounded-full border border-line flex items-center justify-center text-muted hover:text-ink hover:border-ink flex-none"
        >
          <IconRefresh className="w-4 h-4" />
        </button>
      </div>
      <input
        className="field-input"
        value={answer}
        onChange={(e) => onAnswerChange(e.target.value)}
        placeholder="Opíš znaky z obrázka"
        autoComplete="off"
        required
      />
    </div>
  );
}
