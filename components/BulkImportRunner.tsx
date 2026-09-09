'use client';

import { useState } from 'react';
import TxtFileImportButton from './TxtFileImportButton';

type ResultRow = { line: string; status: string; detail?: string; oldValue?: string | null; newValue?: string };

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
  const [batchId, setBatchId] = useState<string | null>(null);
  const [undoStatus, setUndoStatus] = useState<'idle' | 'undoing' | 'done'>('idle');
  const [error, setError] = useState('');

  async function runRequest(preview: boolean) {
    setBusy(true);
    setError('');
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, preview })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Operácia zlyhala.');
      setResults(data.results);
      if (preview) {
        setMode('previewed');
      } else {
        setBatchId(data.batchId || null);
        setUndoStatus('idle');
        setMode('done');
      }
    } catch (err: any) {
      setError(err.message || 'Operácia zlyhala.');
    } finally {
      setBusy(false);
    }
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

      {error && <p className="text-danger text-xs mt-3">{error}</p>}

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
