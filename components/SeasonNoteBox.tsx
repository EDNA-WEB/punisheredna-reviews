'use client';

import { useState } from 'react';

export default function SeasonNoteBox({ seasonId, initialBody }: { seasonId: string; initialBody: string }) {
  const [text, setText] = useState(initialBody);
  const [saved, setSaved] = useState(true);
  const [loading, setLoading] = useState(false);

  async function save() {
    setLoading(true);
    try {
      const res = await fetch('/api/season-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seasonId, body: text })
      });
      if (!res.ok) throw new Error();
      setSaved(true);
    } catch {
      alert('Uloženie poznámky zlyhalo. Skús to prosím znova.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="border border-line rounded-xl overflow-hidden">
      <div className="bg-surface px-4 py-2.5 border-b border-line">
        <h2 className="font-display font-bold text-sm text-ink">Súkromná poznámka</h2>
      </div>
      <div className="p-3 bg-card">
        <textarea
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setSaved(false);
          }}
          placeholder="Poznámka len pre teba…"
          className="field-input-sm min-h-[70px] resize-y"
          maxLength={2000}
        />
        <div className="flex justify-end mt-2">
          <button
            onClick={save}
            disabled={loading || saved}
            className="bg-accent text-white text-xs font-semibold px-4 py-1.5 rounded-full hover:bg-accent-dark disabled:opacity-50"
          >
            {loading ? 'Ukladám…' : saved ? 'Uložené' : 'Uložiť'}
          </button>
        </div>
      </div>
    </div>
  );
}
