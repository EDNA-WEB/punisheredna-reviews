'use client';

import { useState, useMemo } from 'react';

type Row = { key: string; group: string; sk: string; en: string | null; cs: string | null };

export default function TranslationEditor({ initial }: { initial: Row[] }) {
  const [rows, setRows] = useState(initial);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  const groups = useMemo(() => {
    const map = new Map<string, Row[]>();
    for (const r of rows) {
      if (!map.has(r.group)) map.set(r.group, []);
      map.get(r.group)!.push(r);
    }
    return Array.from(map.entries());
  }, [rows]);

  function updateField(key: string, field: 'en' | 'cs', value: string) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, [field]: value } : r)));
    setSaved(false);
  }

  async function saveAll() {
    setLoading(true);
    setSaved(false);
    try {
      const res = await fetch('/api/translations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: rows.map((r) => ({ key: r.key, en: r.en, cs: r.cs })) })
      });
      if (!res.ok) throw new Error();
      setSaved(true);
    } catch {
      alert('Uloženie zlyhalo. Skús to prosím znova.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="sticky top-[130px] z-10 bg-bg py-3 mb-2 flex items-center gap-3 border-b border-line">
        <button onClick={saveAll} disabled={loading} className="bg-accent text-white px-6 py-2.5 rounded-full text-sm font-semibold hover:bg-accent-dark disabled:opacity-50">
          {loading ? 'Ukladám…' : 'Uložiť všetky preklady'}
        </button>
        {saved && <span className="text-emerald-600 text-sm font-semibold">Uložené.</span>}
        <span className="text-xs text-muted ml-auto">{rows.length} položiek</span>
      </div>

      <div className="space-y-3">
        {groups.map(([group, items]) => {
          const isOpen = openGroups[group] ?? true;
          return (
            <div key={group} className="border border-line rounded-xl bg-white overflow-hidden">
              <button
                onClick={() => setOpenGroups((p) => ({ ...p, [group]: !isOpen }))}
                className="w-full flex items-center justify-between px-4 py-3 bg-surface text-left"
              >
                <span className="font-display font-bold text-sm text-ink">{group}</span>
                <span className="text-xs text-muted">{items.length} · {isOpen ? '▲' : '▼'}</span>
              </button>

              {isOpen && (
                <div className="divide-y divide-line">
                  {items.map((row) => (
                    <div key={row.key} className="grid sm:grid-cols-3 gap-3 p-4">
                      <div>
                        <div className="text-[10px] font-semibold uppercase tracking-wide text-muted mb-1">Slovenčina (zdroj)</div>
                        <div className="text-sm text-ink font-medium">{row.sk}</div>
                        <div className="text-[10px] text-muted mt-0.5">{row.key}</div>
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold uppercase tracking-wide text-muted mb-1 block">English</label>
                        <input
                          className="field-input-sm"
                          value={row.en || ''}
                          onChange={(e) => updateField(row.key, 'en', e.target.value)}
                          placeholder="Zatiaľ nepreložené"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold uppercase tracking-wide text-muted mb-1 block">Čeština</label>
                        <input
                          className="field-input-sm"
                          value={row.cs || ''}
                          onChange={(e) => updateField(row.key, 'cs', e.target.value)}
                          placeholder="Zatiaľ nepreložené"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
