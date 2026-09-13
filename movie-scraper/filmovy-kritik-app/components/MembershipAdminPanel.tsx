'use client';

import { useState } from 'react';

type CodeItem = { id: string; code: string; type: string; usedByName: string | null; usedAt: string | null; createdAt: string };

const TYPE_LABELS: Record<string, string> = { trial4d: '4-dňová skúšobná', month: 'Mesačné', year: 'Ročné' };

export default function MembershipAdminPanel({ initialCodes }: { initialCodes: CodeItem[] }) {
  const [codes, setCodes] = useState(initialCodes);
  const [type, setType] = useState<'month' | 'year'>('month');
  const [targetUsername, setTargetUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lastCode, setLastCode] = useState('');

  async function generate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setLastCode('');
    try {
      const res = await fetch('/api/admin/membership', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, targetUsername: targetUsername.trim() || undefined })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Vygenerovanie kódu zlyhalo.');
      setLastCode(data.code);
      setCodes((prev) => [
        { id: data.code, code: data.code, type, usedByName: null, usedAt: null, createdAt: new Date().toISOString() },
        ...prev
      ]);
      setTargetUsername('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <form onSubmit={generate} className="border border-line rounded-xl p-4 mb-6 space-y-3">
        <h2 className="text-sm font-bold text-ink">Vygenerovať nový kód</h2>
        <p className="text-xs text-muted">
          Skúšobné 4-dňové kódy sa generujú automaticky pri registrácii — tu vieš vygenerovať len platené kódy,
          typicky po overení prijatej platby.
        </p>
        <div className="flex items-center gap-3 flex-wrap">
          <select value={type} onChange={(e) => setType(e.target.value as 'month' | 'year')} className="field-input-sm w-auto">
            <option value="month">Mesačné členstvo</option>
            <option value="year">Ročné členstvo</option>
          </select>
          <input
            className="field-input-sm flex-1 min-w-[180px]"
            value={targetUsername}
            onChange={(e) => setTargetUsername(e.target.value)}
            placeholder="Prezývka používateľa (nepovinné — pošle kód rovno do Pošty)"
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-accent text-white text-sm font-semibold px-4 py-2 rounded-full hover:bg-accent-dark disabled:opacity-50 flex-none"
          >
            {loading ? 'Generujem…' : 'Vygenerovať'}
          </button>
        </div>
        {error && <p className="text-danger text-xs">{error}</p>}
        {lastCode && (
          <p className="text-emerald-600 text-sm font-semibold">
            Vygenerovaný kód: <span className="font-mono tracking-widest">{lastCode}</span>
          </p>
        )}
      </form>

      <h2 className="text-sm font-bold text-ink mb-3">História kódov</h2>
      <div className="border border-line rounded-xl overflow-hidden divide-y divide-line">
        {codes.length === 0 ? (
          <p className="text-sm text-muted p-4">Zatiaľ žiadne kódy.</p>
        ) : (
          codes.map((c) => (
            <div key={c.id} className="flex items-center gap-3 p-3 text-sm flex-wrap">
              <span className="font-mono font-semibold text-ink tracking-widest">{c.code}</span>
              <span className="text-xs text-muted border border-line rounded-full px-2 py-0.5">{TYPE_LABELS[c.type] || c.type}</span>
              <span className="ml-auto text-xs text-muted">
                {c.usedByName ? `Uplatnil: ${c.usedByName}` : 'Zatiaľ nepoužitý'}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
