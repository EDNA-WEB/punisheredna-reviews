'use client';

import { useState } from 'react';
import { IconFlag } from './Icons';

export default function ReportOnlineButton({ movieId, isLoggedIn }: { movieId: string; isLoggedIn: boolean }) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  async function submit() {
    setSending(true);
    setError('');
    try {
      const res = await fetch(`/api/movies/${movieId}/report-online`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note })
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Nahlásenie zlyhalo.');
      }
      setDone(true);
    } catch (err: any) {
      setError(err.message || 'Nahlásenie zlyhalo.');
    } finally {
      setSending(false);
    }
  }

  if (!isLoggedIn) return null;

  if (done) {
    return <p className="text-xs text-emerald-600 font-semibold mt-2">Ďakujeme, nahlásenie sme prijali.</p>;
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-danger mt-2"
      >
        <IconFlag className="w-3.5 h-3.5" />
        Nahlásiť chýbajúci film alebo nefunkčný odkaz
      </button>
    );
  }

  return (
    <div className="mt-2 border border-line rounded-lg p-3 max-w-sm">
      <p className="text-xs text-ink font-semibold mb-2">Čo presne je zle? (voliteľné)</p>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={2}
        maxLength={500}
        placeholder="Napr. odkaz nefunguje, film vôbec nie je pridaný…"
        className="w-full border border-line rounded-lg px-2.5 py-1.5 text-xs mb-2"
      />
      {error && <p className="text-danger text-xs mb-2">{error}</p>}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={submit}
          disabled={sending}
          className="bg-danger text-white text-xs font-semibold px-3 py-1.5 rounded-full hover:brightness-95 disabled:opacity-50"
        >
          {sending ? 'Odosielam…' : 'Odoslať nahlásenie'}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="text-xs font-semibold text-muted hover:text-ink">
          Zrušiť
        </button>
      </div>
    </div>
  );
}
