'use client';

import { useState } from 'react';

type Trivia = { id: string; text: string };

export default function MovieTriviaManager({ movieId, initialTrivia }: { movieId: string; initialTrivia: Trivia[] }) {
  const [trivia, setTrivia] = useState<Trivia[]>(initialTrivia);
  const [newText, setNewText] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function addTrivia() {
    if (!newText.trim()) return;
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`/api/movies/${movieId}/trivia`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: newText.trim() })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Pridanie zlyhalo.');
      setTrivia((prev) => [...prev, data]);
      setNewText('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function removeTrivia(id: string) {
    setTrivia((prev) => prev.filter((t) => t.id !== id));
    await fetch(`/api/movies/${movieId}/trivia/${id}`, { method: 'DELETE' }).catch(() => {});
  }

  return (
    <div className="border border-line rounded-xl p-4 bg-surface space-y-3">
      <div className="text-xs font-bold uppercase tracking-wide text-muted">Zaujímavosti ({trivia.length}/50)</div>

      {trivia.length > 0 && (
        <ul className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
          {trivia.map((t, i) => (
            <li key={t.id} className="flex items-start gap-2 text-xs text-ink border-b border-line pb-1.5 last:border-b-0">
              <span className="text-muted flex-none">{i + 1}.</span>
              <span className="flex-1 line-clamp-2">{t.text}</span>
              <button type="button" onClick={() => removeTrivia(t.id)} className="text-muted hover:text-danger flex-none">
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-start gap-2">
        <textarea
          className="field-input-sm flex-1 min-h-[50px]"
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          maxLength={2000}
          placeholder="Napíš novú zaujímavosť a klikni Pridať…"
        />
        <button
          type="button"
          onClick={addTrivia}
          disabled={saving || !newText.trim()}
          className="bg-accent text-white text-xs font-semibold px-3 py-1.5 rounded-full hover:bg-accent-dark disabled:opacity-50 flex-none"
        >
          {saving ? '…' : 'Pridať'}
        </button>
      </div>

      {error && <div className="text-danger text-xs">{error}</div>}
      <p className="text-xs text-muted">Ukladá sa okamžite, nezávisle od uloženia formulára nižšie.</p>
    </div>
  );
}
