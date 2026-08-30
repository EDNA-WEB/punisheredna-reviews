'use client';

import { useState, useRef } from 'react';
import FlagCZ from './FlagCZ';

function insertAtCursor(ref: React.RefObject<HTMLTextAreaElement>, value: string, setValue: (v: string) => void, before: string, after: string, placeholder: string) {
  const el = ref.current;
  if (!el) return;
  const start = el.selectionStart;
  const end = el.selectionEnd;
  const selected = value.slice(start, end) || placeholder;
  const newValue = value.slice(0, start) + before + selected + after + value.slice(end);
  setValue(newValue);
  requestAnimationFrame(() => {
    el.focus();
    el.selectionStart = start + before.length;
    el.selectionEnd = start + before.length + selected.length;
  });
}

export default function AddContentModal({ movieId, movieTitle, movieYear, onClose }: { movieId: string; movieTitle: string; movieYear: string | null; onClose: () => void }) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [blocks, setBlocks] = useState<string[]>(['']);
  const [history, setHistory] = useState<string[][]>([['']]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const textareaRefs = useRef<(HTMLTextAreaElement | null)[]>([]);

  function updateBlock(i: number, value: string) {
    setBlocks((prev) => {
      const next = [...prev];
      next[i] = value;
      const trimmedHistory = history.slice(0, historyIndex + 1);
      setHistory([...trimmedHistory, next]);
      setHistoryIndex(trimmedHistory.length);
      return next;
    });
  }

  function undo() {
    if (historyIndex === 0) return;
    setHistoryIndex(historyIndex - 1);
    setBlocks(history[historyIndex - 1]);
  }

  function redo() {
    if (historyIndex >= history.length - 1) return;
    setHistoryIndex(historyIndex + 1);
    setBlocks(history[historyIndex + 1]);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-night/70 p-4 overflow-y-auto">
      <div className="bg-card rounded-xl w-full max-w-xl my-8 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-muted hover:bg-surface transition-colors"
          aria-label="Zavrieť"
        >
          ✕
        </button>

        <div className="p-6">
          <h2 className="font-display font-extrabold text-2xl text-ink mb-4">Přidat obsah</h2>

          <p className="text-sm text-muted mb-5 leading-relaxed">
            Obsah k filmu/seriálu nemusí byť dlhý (stačí 5-8 viet), ale musí zrozumiteľne popísať, o čom daný film/seriál je.
            Žiadne ďalšie informácie do obsahu nepatria, tie umiestnime do Zaujímavostí. Obsah nesmie film/seriál ani nijako
            hodnotiť, musí byť nestranný. Ďakujeme!
          </p>

          <div className="border border-line rounded-xl overflow-hidden mb-4">
            <div className="bg-surface px-4 py-2.5">
              <span className="font-display font-bold text-ink">{movieTitle}</span>
              {movieYear && <span className="text-muted"> ({movieYear})</span>}
            </div>
            <div className="px-4 py-2.5 flex items-center gap-2">
              <FlagCZ />
            </div>
          </div>

          {blocks.map((block, i) => (
            <div key={i} className="mb-3">
              <div className="flex items-center gap-1 border border-line border-b-0 rounded-t-xl px-2 py-1.5 bg-surface">
                <button type="button" onClick={undo} disabled={historyIndex === 0} title="Späť" className="w-7 h-7 rounded-lg flex items-center justify-center text-ink hover:bg-card disabled:opacity-30">↶</button>
                <button type="button" onClick={redo} disabled={historyIndex >= history.length - 1} title="Vpred" className="w-7 h-7 rounded-lg flex items-center justify-center text-ink hover:bg-card disabled:opacity-30">↷</button>
                <span className="w-px h-5 bg-line mx-1" />
                <button
                  type="button"
                  title="Vložiť odkaz"
                  onClick={() => insertAtCursor(textareaRefs.current[i] as any, block, (v) => updateBlock(i, v), '[', '](https://)', 'text odkazu')}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-ink hover:bg-card"
                >
                  🔗
                </button>
                <button
                  type="button"
                  title="Vyčistiť formátovanie"
                  onClick={() => updateBlock(i, block.replace(/\*\*|\*|\[|\]\(.*?\)/g, ''))}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-ink hover:bg-card"
                >
                  ⌫
                </button>
                <span className="w-px h-5 bg-line mx-1" />
                <button
                  type="button"
                  title="Tučné"
                  onClick={() => insertAtCursor(textareaRefs.current[i] as any, block, (v) => updateBlock(i, v), '**', '**', 'tučný text')}
                  className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-ink hover:bg-card"
                >
                  B
                </button>
                <button
                  type="button"
                  title="Kurzíva"
                  onClick={() => insertAtCursor(textareaRefs.current[i] as any, block, (v) => updateBlock(i, v), '*', '*', 'kurzíva')}
                  className="w-7 h-7 rounded-lg flex items-center justify-center italic text-ink hover:bg-card"
                >
                  I
                </button>
              </div>
              <textarea
                ref={(el) => { textareaRefs.current[i] = el; }}
                value={block}
                onChange={(e) => updateBlock(i, e.target.value)}
                rows={6}
                className="w-full border border-line rounded-b-xl p-3 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent resize-y"
              />
            </div>
          ))}

          <button
            type="button"
            onClick={() => setBlocks((prev) => [...prev, ''])}
            className="text-accent text-sm font-semibold hover:underline mb-5"
          >
            + další obsah
          </button>

          {done ? (
            <p className="text-sm text-accent font-semibold">Ďakujeme! Návrh bol odoslaný na schválenie.</p>
          ) : (
            <>
              {error && <p className="text-danger text-xs mb-3">{error}</p>}
              <div className="flex justify-end">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={async () => {
                    setError('');
                    const combined = blocks.map((b) => b.trim()).filter(Boolean).join('\n\n');
                    if (!combined) {
                      setError('Napíš prosím aspoň jeden odstavec obsahu.');
                      return;
                    }
                    setSubmitting(true);
                    try {
                      const res = await fetch(`/api/movies/${movieId}/content-submissions`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ body: combined })
                      });
                      const data = await res.json();
                      if (!res.ok) throw new Error(data.error || 'Odoslanie zlyhalo.');
                      setDone(true);
                    } catch (err: any) {
                      setError(err.message);
                    } finally {
                      setSubmitting(false);
                    }
                  }}
                  className="bg-danger text-white text-sm font-bold uppercase tracking-wide px-5 py-3 rounded-full hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {submitting ? 'Odosielam…' : 'Poslat obsah ke schválení a korektuře'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
