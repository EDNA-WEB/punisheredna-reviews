'use client';

import { useMemo, useState } from 'react';

type Item = { key: string; type: string; title: string; cover: string | null; date: string; path: string };

export default function ArticleShareAdmin({ initialEnabled, items }: { initialEnabled: boolean; items: Item[] }) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [q, setQ] = useState('');

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? items.filter((i) => i.title.toLowerCase().includes(s)) : items;
  }, [q, items]);

  async function toggle() {
    const next = !enabled;
    setSaving(true);
    try {
      const r = await fetch('/api/admin/article-share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: next })
      });
      if (r.ok) setEnabled(next);
    } finally {
      setSaving(false);
    }
  }

  async function copy(item: Item) {
    const url = `${window.location.origin}${item.path}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      window.prompt('Zkopírujte odkaz:', url);
    }
    setCopied(item.key);
    setTimeout(() => setCopied((c) => (c === item.key ? null : c)), 1800);
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-line bg-card p-5 flex items-center gap-4">
        <div className="flex-1">
          <div className="font-semibold text-ink">Veřejné sdílení článků</div>
          <div className="text-sm text-muted mt-0.5">
            {enabled ? 'Zapnuto — sdílecí odkazy fungují pro kohokoli.' : 'Vypnuto — sdílecí odkazy nefungují, návštěvník uvidí jen přihlášení.'}
          </div>
        </div>
        <button
          type="button"
          onClick={toggle}
          disabled={saving}
          role="switch"
          aria-checked={enabled}
          className={`relative w-12 h-7 rounded-full transition-colors flex-none disabled:opacity-60 ${enabled ? 'bg-emerald-500' : 'bg-line'}`}
        >
          <span className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-all ${enabled ? 'left-6' : 'left-1'}`} />
        </button>
      </div>

      <div className="rounded-xl border border-line bg-card">
        <div className="p-4 border-b border-line flex items-center gap-3">
          <div className="font-semibold text-ink">Odkazy ke sdílení</div>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Hledat článek"
            className="ml-auto w-56 max-w-full h-9 bg-surface border border-line rounded-md px-3 text-sm text-ink placeholder:text-muted outline-none focus:border-accent"
          />
        </div>
        {!enabled && <div className="px-4 py-2.5 text-[13px] text-amber-600 bg-amber-500/10 border-b border-line">Odkazy budou fungovat až po zapnutí sdílení výše.</div>}
        <ul className="divide-y divide-line">
          {list.map((i) => (
            <li key={i.key} className="flex items-center gap-3 px-4 py-3">
              <div className="w-16 h-10 rounded-md bg-surface overflow-hidden flex-none">{i.cover ? <img src={i.cover} alt="" className="w-full h-full object-cover" /> : null}</div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-ink truncate">{i.title}</div>
                <div className="text-[12px] text-muted">
                  {i.type} · {new Date(i.date).toLocaleDateString('cs-CZ')}
                </div>
              </div>
              <button
                type="button"
                onClick={() => copy(i)}
                className={`h-9 px-3 rounded-md text-[13px] font-semibold border transition-colors ${copied === i.key ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-surface border-line text-ink hover:border-accent'}`}
              >
                {copied === i.key ? 'Zkopírováno' : 'Kopírovat odkaz'}
              </button>
            </li>
          ))}
          {list.length === 0 && <li className="px-4 py-8 text-center text-sm text-muted">Žádné články.</li>}
        </ul>
      </div>
    </div>
  );
}
