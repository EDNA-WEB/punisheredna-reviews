'use client';

import { useState } from 'react';

type Trivia = { id: string; text: string };

// Odstráni markdown odkazy [text](url) a ponechá len samotný text (napr. meno herca
// alebo prispievateľa) — takto vložené bloky (napr. z ČSFD) sa dajú rovno použiť.
function stripMarkdownLinks(text: string): string {
  return text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
}

// Rozdelí veľký blok textu na jednotlivé zaujímavosti — nová položka začína buď na
// úplnom začiatku textu, alebo na riadku začínajúcom hviezdičkou ("* ").
function splitBulkText(raw: string): string[] {
  const withMarker = '\n* ' + raw.trim();
  const parts = withMarker.split(/\n\*\s+/).map((p) => p.trim()).filter(Boolean);
  return parts.map((p) => stripMarkdownLinks(p.replace(/\s+/g, ' ').trim()));
}

export default function MovieTriviaManager({ movieId, initialTrivia }: { movieId: string; initialTrivia: Trivia[] }) {
  const [trivia, setTrivia] = useState<Trivia[]>(initialTrivia);
  const [newText, setNewText] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [bulkMode, setBulkMode] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [bulkPreview, setBulkPreview] = useState<string[] | null>(null);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [bulkProgress, setBulkProgress] = useState(0);

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

  function previewBulk() {
    const parts = splitBulkText(bulkText);
    setBulkPreview(parts);
  }

  function removeFromPreview(index: number) {
    setBulkPreview((prev) => (prev ? prev.filter((_, i) => i !== index) : prev));
  }

  async function confirmBulk() {
    if (!bulkPreview || bulkPreview.length === 0) return;
    setBulkSaving(true);
    setBulkProgress(0);
    setError('');
    const added: Trivia[] = [];
    for (const text of bulkPreview) {
      try {
        const res = await fetch(`/api/movies/${movieId}/trivia`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text })
        });
        const data = await res.json();
        if (res.ok) added.push(data);
        setBulkProgress((p) => p + 1);
      } catch {
        // pri chybe jednej položky pokračujeme ďalej, nech sa nezastaví celý proces
      }
    }
    setTrivia((prev) => [...prev, ...added]);
    setBulkSaving(false);
    setBulkMode(false);
    setBulkText('');
    setBulkPreview(null);
  }

  return (
    <div className="border border-line rounded-xl p-4 bg-surface space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-xs font-bold uppercase tracking-wide text-muted">Zaujímavosti ({trivia.length}/50)</div>
        <button
          type="button"
          onClick={() => {
            setBulkMode((v) => !v);
            setBulkPreview(null);
          }}
          className="text-xs font-semibold text-accent hover:underline"
        >
          {bulkMode ? 'Zrušiť hromadné pridávanie' : 'Hromadne pridať (vložiť blok textu)'}
        </button>
      </div>

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

      {bulkMode ? (
        <div className="space-y-2 border-t border-line pt-3">
          {!bulkPreview ? (
            <>
              <textarea
                className="field-input-sm w-full min-h-[160px] font-mono text-xs"
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                placeholder={'Vlož celý blok textu naraz (napr. skopírovaný z ČSFD) — nové položky rozpoznám podľa "* " na začiatku riadku.'}
              />
              <button
                type="button"
                onClick={previewBulk}
                disabled={!bulkText.trim()}
                className="bg-accent text-white text-xs font-semibold px-4 py-2 rounded-full hover:bg-accent-dark disabled:opacity-50"
              >
                Rozdeliť na položky
              </button>
            </>
          ) : (
            <>
              <p className="text-xs text-muted">Našiel som {bulkPreview.length} položiek. Skontroluj a prípadne niektorú odstráň, potom potvrď.</p>
              <ul className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                {bulkPreview.map((text, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-ink border-b border-line pb-1.5 last:border-b-0">
                    <span className="text-muted flex-none">{i + 1}.</span>
                    <span className="flex-1">{text}</span>
                    <button type="button" onClick={() => removeFromPreview(i)} className="text-muted hover:text-danger flex-none">
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={confirmBulk}
                  disabled={bulkSaving || bulkPreview.length === 0}
                  className="bg-accent text-white text-xs font-semibold px-4 py-2 rounded-full hover:bg-accent-dark disabled:opacity-50"
                >
                  {bulkSaving ? `Ukladám… (${bulkProgress}/${bulkPreview.length})` : `Potvrdiť a pridať všetkých ${bulkPreview.length}`}
                </button>
                <button type="button" onClick={() => setBulkPreview(null)} disabled={bulkSaving} className="text-xs text-muted hover:underline">
                  Späť na úpravu textu
                </button>
              </div>
            </>
          )}
        </div>
      ) : (
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
      )}

      {error && <div className="text-danger text-xs">{error}</div>}
      <p className="text-xs text-muted">Ukladá sa okamžite, nezávisle od uloženia formulára nižšie.</p>
    </div>
  );
}
