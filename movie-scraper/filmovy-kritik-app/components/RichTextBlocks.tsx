'use client';

import { useState, useRef } from 'react';

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

export default function RichTextBlocks({ addMoreLabel, onChange }: { addMoreLabel: string; onChange: (combined: string) => void }) {
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
      onChange(next.map((b) => b.trim()).filter(Boolean).join('\n\n'));
      return next;
    });
  }

  function undo() {
    if (historyIndex === 0) return;
    setHistoryIndex(historyIndex - 1);
    setBlocks(history[historyIndex - 1]);
    onChange(history[historyIndex - 1].map((b) => b.trim()).filter(Boolean).join('\n\n'));
  }

  function redo() {
    if (historyIndex >= history.length - 1) return;
    setHistoryIndex(historyIndex + 1);
    setBlocks(history[historyIndex + 1]);
    onChange(history[historyIndex + 1].map((b) => b.trim()).filter(Boolean).join('\n\n'));
  }

  return (
    <>
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
        className="text-accent text-sm font-semibold hover:underline"
      >
        + {addMoreLabel}
      </button>
    </>
  );
}
