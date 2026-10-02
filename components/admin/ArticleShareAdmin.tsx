'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

type Stats = { total: number; week: number; unique: number; last: string | null };
type Item = { key: string; type: string; title: string; cover: string | null; date: string; path: string; stats: Stats };
type Summary = { total: number; week: number; unique: number; articles: number; sources: Array<{ source: string; count: number }> };

const fmt = (n: number) => new Intl.NumberFormat('cs-CZ').format(n);

function ago(iso: string | null) {
  if (!iso) return '—';
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return 'právě teď';
  if (m < 60) return `před ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `před ${h} h`;
  const d = Math.round(h / 24);
  return d < 30 ? `před ${d} d` : new Date(iso).toLocaleDateString('cs-CZ');
}

export default function ArticleShareAdmin({ initialEnabled, items, summary }: { initialEnabled: boolean; items: Item[]; summary: Summary }) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(initialEnabled);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<'date' | 'clicks'>('date');
  const [onlyShared, setOnlyShared] = useState(false);

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    let l = s ? items.filter((i) => i.title.toLowerCase().includes(s)) : items;
    if (onlyShared) l = l.filter((i) => i.stats.total > 0);
    if (sort === 'clicks') l = [...l].sort((a, b) => b.stats.total - a.stats.total || b.date.localeCompare(a.date));
    return l;
  }, [q, items, sort, onlyShared]);

  async function post(body: object) {
    setSaving(true);
    try {
      const r = await fetch('/api/admin/article-share', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      return r.ok ? await r.json() : null;
    } finally {
      setSaving(false);
    }
  }

  async function toggle() {
    const d = await post({ enabled: !enabled });
    if (d) setEnabled(d.enabled);
  }

  async function rotate() {
    if (!window.confirm('Opravdu zneplatnit VŠECHNY dosud rozeslané odkazy? Lidé, kterým jste odkaz poslali, článek už neotevřou. Nové odkazy se vytvoří automaticky.')) return;
    const d = await post({ rotate: true });
    if (d) router.refresh();
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
      <div className="rounded-xl border border-line bg-card p-5 flex flex-wrap items-center gap-4">
        <div className="flex-1 min-w-[220px]">
          <div className="font-semibold text-ink">Veřejné sdílení článků</div>
          <div className="text-sm text-muted mt-0.5">
            {enabled ? 'Zapnuto — odkazy s klíčem fungují pro kohokoli.' : 'Vypnuto — žádný sdílecí odkaz nefunguje, návštěvník uvidí jen přihlášení.'}
          </div>
        </div>
        <button type="button" onClick={rotate} disabled={saving} className="h-9 px-3 rounded-md border border-line text-[13px] font-semibold text-ink hover:border-rose-500 hover:text-rose-600 disabled:opacity-50">
          Zneplatnit všechny odkazy
        </button>
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

      {/* Súhrn */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          ['Otevření celkem', summary.total],
          ['Unikátní návštěvníci', summary.unique],
          ['Za posledních 7 dní', summary.week],
          ['Sdílených článků', summary.articles]
        ].map(([label, value]) => (
          <div key={label as string} className="rounded-xl border border-line bg-card p-4">
            <div className="text-[12px] text-muted">{label}</div>
            <div className="text-2xl font-extrabold text-ink tabular-nums mt-1">{fmt(value as number)}</div>
          </div>
        ))}
      </div>
      {summary.sources.length > 0 && (
        <div className="rounded-xl border border-line bg-card p-4">
          <div className="text-[12px] font-semibold uppercase tracking-wider text-muted mb-2">Odkud lidé přicházejí</div>
          <div className="flex flex-wrap gap-2">
            {summary.sources.map((s) => (
              <span key={s.source} className="text-[13px] bg-surface border border-line rounded-md px-2.5 py-1 text-ink">
                {s.source} <span className="text-muted tabular-nums">· {fmt(s.count)}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-xl border border-line bg-card">
        <div className="p-4 border-b border-line flex flex-wrap items-center gap-3">
          <div className="font-semibold text-ink">Články a odkazy</div>
          <label className="flex items-center gap-2 text-[13px] text-muted ml-auto">
            <input type="checkbox" checked={onlyShared} onChange={(e) => setOnlyShared(e.target.checked)} /> Jen otevírané
          </label>
          <select value={sort} onChange={(e) => setSort(e.target.value as any)} className="h-9 bg-surface border border-line rounded-md px-2 text-[13px] text-ink">
            <option value="date">Nejnovější</option>
            <option value="clicks">Nejvíce otevření</option>
          </select>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Hledat článek"
            className="w-52 max-w-full h-9 bg-surface border border-line rounded-md px-3 text-sm text-ink placeholder:text-muted outline-none focus:border-accent"
          />
        </div>
        {!enabled && <div className="px-4 py-2.5 text-[13px] text-amber-600 bg-amber-500/10 border-b border-line">Odkazy budou fungovat až po zapnutí sdílení výše.</div>}
        <div className="hidden md:grid grid-cols-[1fr_80px_80px_80px_110px_150px] gap-3 px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted border-b border-line">
          <span>Článek</span>
          <span className="text-right">Otevření</span>
          <span className="text-right">Unikátní</span>
          <span className="text-right">7 dní</span>
          <span className="text-right">Naposledy</span>
          <span />
        </div>
        <ul className="divide-y divide-line">
          {list.map((i) => (
            <li key={i.key} className="grid grid-cols-[1fr_auto] md:grid-cols-[1fr_80px_80px_80px_110px_150px] gap-3 items-center px-4 py-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-16 h-10 rounded-md bg-surface overflow-hidden flex-none">{i.cover ? <img src={i.cover} alt="" className="w-full h-full object-cover" /> : null}</div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-ink truncate">{i.title}</div>
                  <div className="text-[12px] text-muted">
                    {i.type} · {new Date(i.date).toLocaleDateString('cs-CZ')}
                    <span className="md:hidden"> · {fmt(i.stats.total)}× otevřeno</span>
                  </div>
                </div>
              </div>
              <span className="hidden md:block text-right text-sm font-semibold text-ink tabular-nums">{fmt(i.stats.total)}</span>
              <span className="hidden md:block text-right text-sm text-ink tabular-nums">{fmt(i.stats.unique)}</span>
              <span className="hidden md:block text-right text-sm text-ink tabular-nums">{fmt(i.stats.week)}</span>
              <span className="hidden md:block text-right text-[13px] text-muted">{ago(i.stats.last)}</span>
              <button
                type="button"
                onClick={() => copy(i)}
                className={`h-9 px-3 rounded-md text-[13px] font-semibold border transition-colors justify-self-end ${copied === i.key ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-surface border-line text-ink hover:border-accent'}`}
              >
                {copied === i.key ? 'Zkopírováno' : 'Kopírovat odkaz'}
              </button>
            </li>
          ))}
          {list.length === 0 && <li className="px-4 py-8 text-center text-sm text-muted">Žádné články.</li>}
        </ul>
      </div>
      <p className="text-[12px] text-muted">
        Počítá se každé otevření článku přes sdílecí odkaz. Náhledy odkazů (Messenger, WhatsApp, Facebook…) a roboti se nepočítají, stejně jako opakované
        načtení stránky stejným člověkem do 10 minut. IP adresy se neukládají.
      </p>
    </div>
  );
}
