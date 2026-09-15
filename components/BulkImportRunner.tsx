'use client';

import { useState } from 'react';
import TxtFileImportButton from './TxtFileImportButton';

type ResultRow = { line: string; status: string; detail?: string; oldValue?: string | null; newValue?: string };

const LINES_PER_BATCH = 30;
const BATCH_TIMEOUT_MS = 25000;

// Rozdelí vstup na dávky riadkov, aby sme mohli počas spracovania priebežne
// zobrazovať progress bar (koľko z celku je hotových). Ak vstup vyzerá ako
// JSON (začína "[" alebo "{"), delenie po riadkoch by ho pokazilo — v tom
// prípade sa spracuje ako jedna jediná dávka.
function splitIntoBatches(text: string): string[] {
  const trimmed = text.trim();
  if (trimmed.startsWith('[') || trimmed.startsWith('{')) return [text];

  const lines = text.split('\n').filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [text];

  const batches: string[] = [];
  for (let i = 0; i < lines.length; i += LINES_PER_BATCH) {
    batches.push(lines.slice(i, i + LINES_PER_BATCH).join('\n'));
  }
  return batches;
}

function randomId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export default function BulkImportRunner({
  endpoint,
  title,
  description,
  placeholder,
  buttonLabel
}: {
  endpoint: string;
  title: string;
  description: string;
  placeholder: string;
  buttonLabel: string;
}) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<'idle' | 'previewed' | 'done'>('idle');
  const [results, setResults] = useState<ResultRow[] | null>(null);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [batchId, setBatchId] = useState<string | null>(null);
  const [undoStatus, setUndoStatus] = useState<'idle' | 'undoing' | 'done'>('idle');
  const [error, setError] = useState('');

  async function runRequest(preview: boolean) {
    setBusy(true);
    setError('');

    const batches = splitIntoBatches(text);
    const sharedBatchId = preview ? undefined : randomId();
    const allResults: ResultRow[] = [];
    const batchErrors: string[] = [];
    setProgress({ done: 0, total: batches.length });

    for (let i = 0; i < batches.length; i++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), BATCH_TIMEOUT_MS);
      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: batches[i], preview, ...(sharedBatchId ? { batchId: sharedBatchId } : {}) }),
          signal: controller.signal
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Operácia zlyhala.');
        allResults.push(...(data.results || []));
      } catch (err: any) {
        // Chybu tejto dávky si len zaznamenáme a pokračujeme ďalšou dávkou —
        // jedno zlyhanie (napr. dočasný výpadok siete, alebo vypršanie
        // časového limitu) nesmie zastaviť spracovanie zvyšku zoznamu.
        const firstLine = batches[i].split('\n')[0]?.slice(0, 60) || '';
        const message = err.name === 'AbortError' ? `vypršal časový limit (${BATCH_TIMEOUT_MS / 1000}s)` : err.message || 'neznáma chyba';
        batchErrors.push(`Dávka ${i + 1}/${batches.length} (začína "${firstLine}…") zlyhala: ${message}`);
      } finally {
        clearTimeout(timeoutId);
      }
      setProgress({ done: i + 1, total: batches.length });
      setResults([...allResults]);
    }

    if (batchErrors.length > 0) {
      setError(batchErrors.join('\n'));
    }

    if (preview) {
      setMode('previewed');
    } else {
      setBatchId(sharedBatchId || null);
      setUndoStatus('idle');
      setMode('done');
    }
    setBusy(false);
  }

  async function handleUndo() {
    if (!batchId) return;
    setUndoStatus('undoing');
    try {
      const res = await fetch('/api/admin/bulk-import/undo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batchId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Vrátenie späť zlyhalo.');
      setUndoStatus('done');
    } catch (err: any) {
      setError(err.message || 'Vrátenie späť zlyhalo.');
      setUndoStatus('idle');
    }
  }

  function handleTextChange(newText: string) {
    setText(newText);
    setMode('idle');
    setResults(null);
    setBatchId(null);
    setProgress({ done: 0, total: 0 });
  }

  const changedCount = results?.filter((r) => r.status !== 'BEZ ZMENY' && !['CHYBA', 'NENÁJDENÉ', 'NEJEDNOZNAČNÉ', 'BEZ PREMIÉR'].includes(r.status)).length || 0;

  return (
    <div className="border border-line rounded-xl p-4 bg-surface mb-6">
      <div className="text-sm font-semibold text-ink mb-1">{title}</div>
      <div className="text-xs text-muted mb-3">{description}</div>

      <textarea
        value={text}
        onChange={(e) => handleTextChange(e.target.value)}
        rows={6}
        placeholder={placeholder}
        className="w-full border border-line rounded-lg px-3 py-2 text-sm font-mono mb-3"
      />

      <div className="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={() => runRequest(true)}
          disabled={busy || !text.trim()}
          className="border border-line text-ink text-sm font-semibold px-5 py-2.5 rounded-full hover:border-accent hover:text-accent disabled:opacity-50"
        >
          {busy && mode !== 'previewed' ? 'Načítavam…' : 'Zobraziť náhľad'}
        </button>

        {mode === 'previewed' && (
          <button
            type="button"
            onClick={() => runRequest(false)}
            disabled={busy}
            className="bg-accent text-white text-sm font-semibold px-5 py-2.5 rounded-full hover:bg-accent-dark disabled:opacity-50"
          >
            {busy ? 'Ukladám…' : `Potvrdiť a uložiť (${changedCount})`}
          </button>
        )}

        <TxtFileImportButton onText={handleTextChange} />
      </div>

      {busy && progress.total > 1 && (
        <div className="mt-3">
          <div className="flex items-center justify-between text-xs text-muted mb-1">
            <span>Spracúvam…</span>
            <span>
              {progress.done} / {progress.total}
            </span>
          </div>
          <div className="h-1.5 bg-line rounded-full overflow-hidden">
            <div
              className="h-1.5 bg-accent transition-all duration-300"
              style={{ width: `${(progress.done / progress.total) * 100}%` }}
            />
          </div>
        </div>
      )}

      {error && <p className="text-danger text-xs mt-3 whitespace-pre-line">{error}</p>}

      {mode === 'previewed' && results && (
        <div className="mt-4">
          <div className="text-xs font-semibold text-ink mb-2">
            Náhľad — {changedCount} zmien sa uloží po kliknutí na "Potvrdiť a uložiť". Nič sa zatiaľ nezapísalo do databázy.
          </div>
          <div className="border border-line rounded-lg overflow-hidden divide-y divide-line max-h-80 overflow-y-auto">
            {results.map((r, i) => (
              <div key={i} className="px-3 py-2 text-xs">
                <div className={`font-semibold ${r.status === 'OK' ? 'text-accent' : r.status === 'BEZ ZMENY' ? 'text-muted' : 'text-danger'}`}>
                  {r.status} — {r.detail || r.line}
                </div>
                {r.oldValue !== undefined && r.status === 'OK' && (
                  <div className="text-muted mt-0.5">
                    <span className="line-through">{r.oldValue || '(prázdne)'}</span> → <span className="text-ink">{r.newValue}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {mode === 'done' && results && (
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs font-semibold text-ink">Hotovo — uložených {changedCount} zmien.</div>
            {batchId && undoStatus !== 'done' && (
              <button
                type="button"
                onClick={handleUndo}
                disabled={undoStatus === 'undoing'}
                className="text-xs font-semibold text-danger border border-danger/40 rounded-full px-3 py-1.5 hover:bg-danger/10 disabled:opacity-50"
              >
                {undoStatus === 'undoing' ? 'Vraciam späť…' : 'Vrátiť túto dávku späť'}
              </button>
            )}
            {undoStatus === 'done' && <span className="text-xs font-semibold text-emerald-600">Vrátené späť ✓</span>}
          </div>
          <div className="border border-line rounded-lg overflow-hidden divide-y divide-line max-h-80 overflow-y-auto">
            {results.map((r, i) => (
              <div key={i} className={`px-3 py-2 text-xs ${r.status === 'OK' ? 'text-ink' : 'text-danger'}`}>
                <span className="font-semibold">{r.status}</span> — {r.detail || r.line}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
