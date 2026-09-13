'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function EntityReviewForm({ apiBase }: { apiBase: string }) {
  const router = useRouter();
  const [body, setBody] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  async function submit() {
    if (!body.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${apiBase}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Uloženie zlyhalo.');
      setBody('');
      setOpen(false);
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="bg-accent text-white text-sm font-semibold px-5 py-2.5 rounded-full hover:bg-accent-dark">
        + Napísať recenziu
      </button>
    );
  }

  return (
    <div>
      <textarea
        className="field-input min-h-[160px]"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Napíš svoju recenziu…"
        maxLength={20000}
        autoFocus
      />
      {error && <div className="text-danger text-sm mt-1.5">{error}</div>}
      <div className="flex items-center gap-2.5 mt-2.5">
        <button
          onClick={submit}
          disabled={loading}
          className="bg-accent text-white text-sm font-semibold px-5 py-2 rounded-full hover:bg-accent-dark disabled:opacity-50"
        >
          {loading ? 'Ukladám…' : 'Uverejniť recenziu'}
        </button>
        <button onClick={() => setOpen(false)} className="text-sm text-muted hover:text-ink">
          Zrušiť
        </button>
      </div>
    </div>
  );
}
