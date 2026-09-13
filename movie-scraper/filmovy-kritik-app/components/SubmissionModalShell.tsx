'use client';

import { useState } from 'react';
import FlagCZ from './FlagCZ';
import FlagSK from './FlagSK';

export default function SubmissionModalShell({
  title,
  explanation,
  movieTitle,
  movieYear,
  submitLabel,
  onSubmit,
  children
}: {
  title: string;
  explanation: string;
  movieTitle: string;
  movieYear: string | null;
  submitLabel: string;
  onSubmit: () => Promise<{ ok: boolean; error?: string }>;
  children: React.ReactNode;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  async function handleSubmit() {
    setError('');
    setSubmitting(true);
    try {
      const result = await onSubmit();
      if (!result.ok) throw new Error(result.error || 'Odoslanie zlyhalo.');
      setDone(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <h2 className="font-display font-extrabold text-2xl text-ink mb-4">{title}</h2>

      <p className="text-sm text-muted mb-5 leading-relaxed">{explanation}</p>

      <div className="border border-line rounded-xl overflow-hidden mb-4">
        <div className="bg-surface px-4 py-2.5">
          <span className="font-display font-bold text-ink">{movieTitle}</span>
          {movieYear && <span className="text-muted"> ({movieYear})</span>}
        </div>
        <div className="px-4 py-2.5 flex items-center gap-2">
          <FlagCZ />
          <FlagSK />
        </div>
      </div>

      {done ? (
        <p className="text-sm text-accent font-semibold">Ďakujeme! Návrh bol odoslaný na schválenie.</p>
      ) : (
        <>
          {children}
          {error && <p className="text-danger text-xs mt-3">{error}</p>}
          <div className="flex justify-end mt-4">
            <button
              type="button"
              disabled={submitting}
              onClick={handleSubmit}
              className="bg-danger text-white text-xs font-bold uppercase tracking-wide px-4 py-2 rounded-full hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {submitting ? 'Odosielam…' : submitLabel}
            </button>
          </div>
        </>
      )}
    </>
  );
}
