'use client';

import { useState } from 'react';

export default function SystemBroadcastForm({ recipientCount }: { recipientCount: number }) {
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sentCount, setSentCount] = useState<number | null>(null);

  async function send() {
    if (!confirm(`Naozaj chceš túto správu odoslať všetkým ${recipientCount} používateľom? Táto akcia sa nedá vziať späť.`)) {
      return;
    }
    setLoading(true);
    setError('');
    setSentCount(null);
    try {
      const res = await fetch('/api/admin/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Odoslanie zlyhalo.');
      setSentCount(data.count);
      setBody('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-xl space-y-4">
      <div>
        <label className="block text-sm font-semibold text-ink mb-2">Text správy</label>
        <textarea
          className="field-input min-h-[160px]"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="napr. novinka na webe, upozornenie, reklama…"
          maxLength={5000}
        />
        <div className="text-xs text-muted mt-1.5 text-right">{body.length}/5000</div>
      </div>

      <p className="text-xs text-muted">
        Správa príde do schránky (Pošta) presne <strong className="text-ink">{recipientCount}</strong> používateľom — od účtu "Systém",
        nie od tvojho osobného účtu.
      </p>

      {error && <div className="text-danger text-sm">{error}</div>}
      {sentCount !== null && (
        <div className="text-emerald-600 text-sm font-semibold">
          Hotovo — správa bola odoslaná {sentCount} používateľom.
        </div>
      )}

      <button
        onClick={send}
        disabled={loading || !body.trim()}
        className="bg-accent text-white px-6 py-2.5 rounded-full text-sm font-semibold hover:bg-accent-dark disabled:opacity-50"
      >
        {loading ? 'Odosielam…' : 'Hromadne odoslať'}
      </button>
    </div>
  );
}
