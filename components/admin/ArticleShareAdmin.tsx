'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

type Stats = { total: number; sessions: number; week: number; last: string | null };
type Item = { key: string; type: 'news' | 'blog'; ref: string; typeLabel: string; title: string; cover: string | null; date: string; path: string; stats: Stats };
type Counted = { key: string; count: number };
type Breakdowns = Record<'sources' | 'referrers' | 'countries' | 'regions' | 'cities' | 'devices' | 'oses' | 'browsers' | 'isps', Counted[]>;

const fmt = (n: number) => new Intl.NumberFormat('cs-CZ').format(n);
const DEVICE: Record<string, string> = { mobile: 'Mobil', tablet: 'Tablet', desktop: 'Počítač' };

let regionNames: Intl.DisplayNames | null = null;
function countryName(code: string) {
  if (!code) return 'Neznámá';
  try {
    regionNames ||= new Intl.DisplayNames(['cs'], { type: 'region' });
    return regionNames.of(code) || code;
  } catch {
    return code;
  }
}

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

function Card({ title, children, className = '' }: { title?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-line bg-card p-5 ${className}`}>
      {title && <h2 className="text-[15px] font-semibold text-ink mb-3">{title}</h2>}
      {children}
    </section>
  );
}

function Breakdown({ title, rows, label = (k: string) => k || 'Neuvedeno' }: { title: string; rows: Counted[]; label?: (k: string) => string }) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <Card title={title}>
      {rows.length === 0 ? (
        <p className="text-[13px] text-muted">Zatím žádná data.</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => (
            <li key={r.key || '—'} className="text-[13px]">
              <div className="flex items-center justify-between gap-3">
                <span className="text-ink truncate">{label(r.key)}</span>
                <span className="text-muted tabular-nums">{fmt(r.count)}</span>
              </div>
              <div className="h-1.5 rounded-full bg-surface mt-1 overflow-hidden">
                <div className="h-full rounded-full bg-accent/70" style={{ width: `${(r.count / max) * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export default function ArticleShareAdmin({
  initialEnabled,
  initialOptedOut,
  items,
  selected,
  totals,
  daily,
  breakdowns
}: {
  initialEnabled: boolean;
  initialOptedOut: boolean;
  items: Item[];
  selected: { key: string; title: string } | null;
  totals: { total: number; sessions: number; week: number };
  daily: Array<{ day: string; visits: number }>;
  breakdowns: Breakdowns;
}) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(initialEnabled);
  const [optedOut, setOptedOut] = useState(initialOptedOut);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<'date' | 'clicks'>('date');
  const [onlyShared, setOnlyShared] = useState(false);
  const [placementFor, setPlacementFor] = useState<string | null>(null);
  const [placement, setPlacement] = useState('');

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    let l = s ? items.filter((i) => i.title.toLowerCase().includes(s)) : items;
    if (onlyShared) l = l.filter((i) => i.stats.total > 0);
    if (sort === 'clicks') l = [...l].sort((a, b) => b.stats.total - a.stats.total || b.date.localeCompare(a.date));
    return l;
  }, [q, items, sort, onlyShared]);

  // 30 dní pre graf (aj dni bez návštev)
  const chart = useMemo(() => {
    const map = new Map(daily.map((d) => [d.day, d.visits]));
    const out: Array<{ day: string; visits: number }> = [];
    for (let i = 29; i >= 0; i--) {
      const day = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
      out.push({ day, visits: map.get(day) || 0 });
    }
    return out;
  }, [daily]);
  const chartMax = Math.max(1, ...chart.map((c) => c.visits));

  async function post(url: string, method: string, body?: object) {
    setSaving(true);
    try {
      const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
      return r.ok ? await r.json() : null;
    } finally {
      setSaving(false);
    }
  }

  async function toggle() {
    const d = await post('/api/admin/article-share', 'POST', { enabled: !enabled });
    if (d) setEnabled(d.enabled);
  }
  async function rotate() {
    if (!window.confirm('Opravdu zneplatnit VŠECHNY dosud rozeslané odkazy? Lidé, kterým jste odkaz poslali, článek už neotevřou.')) return;
    if (await post('/api/admin/article-share', 'POST', { rotate: true })) router.refresh();
  }
  async function toggleOptOut() {
    const d = await post('/api/admin/analytics-optout', optedOut ? 'DELETE' : 'POST');
    if (d) setOptedOut(d.excluded);
  }

  async function copyText(key: string, path: string) {
    const url = `${window.location.origin}${path}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      window.prompt('Zkopírujte odkaz:', url);
    }
    setCopied(key);
    setTimeout(() => setCopied((c) => (c === key ? null : c)), 1800);
  }

  async function copyWithPlacement(item: Item) {
    const d = await post('/api/admin/article-share/link', 'POST', { type: item.type, ref: item.ref, label: placement });
    if (d?.path) {
      await copyText(`${item.key}:p`, d.path);
      setPlacement('');
      setPlacementFor(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Nastavenie */}
      <Card>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[220px]">
            <div className="font-semibold text-ink">Veřejné sdílení článků</div>
            <div className="text-sm text-muted mt-0.5">
              {enabled ? 'Zapnuto — odkazy s klíčem fungují pro kohokoli.' : 'Vypnuto — žádný sdílecí odkaz nefunguje, návštěvník uvidí jen přihlášení.'}
            </div>
          </div>
          <button type="button" onClick={toggleOptOut} disabled={saving} className="h-9 px-3 rounded-lg border border-line text-[13px] font-semibold text-ink hover:border-accent disabled:opacity-50">
            {optedOut ? 'Toto zařízení se nepočítá ✓' : 'Nezapočítávat toto zařízení'}
          </button>
          <button type="button" onClick={rotate} disabled={saving} className="h-9 px-3 rounded-lg border border-line text-[13px] font-semibold text-ink hover:border-rose-500 hover:text-rose-600 disabled:opacity-50">
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
      </Card>

      {selected && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-accent/40 bg-accent/5 px-4 py-3 text-sm">
          <span className="text-ink">
            Statistiky článku: <strong>{selected.title}</strong>
          </span>
          <Link href="/admin/sdileni" className="font-semibold text-accent hover:underline">
            Zobrazit vše
          </Link>
        </div>
      )}

      {/* Súhrn + graf */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          ['Zobrazení celkem', totals.total],
          ['Návštěv (relací)', totals.sessions],
          ['Zobrazení za 7 dní', totals.week]
        ].map(([label, value]) => (
          <div key={label as string} className="rounded-2xl border border-line bg-card p-5">
            <div className="text-[12.5px] text-muted">{label}</div>
            <div className="text-[28px] font-extrabold text-ink tabular-nums mt-1 leading-none">{fmt(value as number)}</div>
          </div>
        ))}
      </div>
      <Card title="Zobrazení za posledních 30 dní">
        <div className="flex items-end gap-[3px] h-32">
          {chart.map((c) => (
            <div key={c.day} className="flex-1 h-full flex items-end" title={`${new Date(c.day).toLocaleDateString('cs-CZ')}: ${c.visits}`}>
              <div className="w-full rounded-t bg-accent/80" style={{ height: `${Math.max(c.visits ? 4 : 1, (c.visits / chartMax) * 100)}%`, opacity: c.visits ? 1 : 0.25 }} />
            </div>
          ))}
        </div>
        <div className="flex justify-between text-[11px] text-muted mt-2">
          <span>{new Date(chart[0].day).toLocaleDateString('cs-CZ')}</span>
          <span>dnes</span>
        </div>
      </Card>

      {/* Rozpad za 30 dní */}
      <div>
        <div className="text-[12px] font-semibold uppercase tracking-wider text-muted mb-2">Odkud a čím (posledních 30 dní, podle návštěv)</div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <Breakdown title="Umístění odkazu" rows={breakdowns.sources} label={(k) => k || 'Bez umístění'} />
          <Breakdown title="Odkazující web" rows={breakdowns.referrers} label={(k) => k || 'Přímo / aplikace'} />
          <Breakdown title="Země" rows={breakdowns.countries} label={countryName} />
          <Breakdown title="Kraj / region" rows={breakdowns.regions} />
          <Breakdown title="Město" rows={breakdowns.cities} />
          <Breakdown title="Poskytovatel připojení" rows={breakdowns.isps} />
          <Breakdown title="Zařízení" rows={breakdowns.devices} label={(k) => DEVICE[k] || 'Neznámé'} />
          <Breakdown title="Operační systém" rows={breakdowns.oses} />
          <Breakdown title="Prohlížeč" rows={breakdowns.browsers} />
        </div>
      </div>

      {/* Články */}
      <section className="rounded-2xl border border-line bg-card">
        <div className="p-4 border-b border-line flex flex-wrap items-center gap-3">
          <h2 className="text-[15px] font-semibold text-ink">Články a odkazy</h2>
          <label className="flex items-center gap-2 text-[13px] text-muted ml-auto">
            <input type="checkbox" checked={onlyShared} onChange={(e) => setOnlyShared(e.target.checked)} /> Jen otevírané
          </label>
          <select value={sort} onChange={(e) => setSort(e.target.value as any)} className="h-9 bg-surface border border-line rounded-lg px-2 text-[13px] text-ink">
            <option value="date">Nejnovější</option>
            <option value="clicks">Nejvíce zobrazení</option>
          </select>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Hledat článek"
            className="w-52 max-w-full h-9 bg-surface border border-line rounded-lg px-3 text-sm text-ink placeholder:text-muted outline-none focus:border-accent"
          />
        </div>
        {!enabled && <div className="px-4 py-2.5 text-[13px] text-amber-600 bg-amber-500/10 border-b border-line">Odkazy budou fungovat až po zapnutí sdílení výše.</div>}
        <ul className="divide-y divide-line">
          {list.map((i) => (
            <li key={i.key} className="px-4 py-3">
              <div className="flex flex-wrap items-center gap-3">
                <div className="w-16 h-10 rounded-md bg-surface overflow-hidden flex-none">{i.cover ? <img src={i.cover} alt="" className="w-full h-full object-cover" /> : null}</div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-ink truncate">{i.title}</div>
                  <div className="text-[12px] text-muted">
                    {i.typeLabel} · {new Date(i.date).toLocaleDateString('cs-CZ')} · <span className="tabular-nums">{fmt(i.stats.total)}</span> zobrazení ·{' '}
                    <span className="tabular-nums">{fmt(i.stats.week)}</span> za 7 dní · naposledy {ago(i.stats.last)}
                  </div>
                </div>
                {i.stats.total > 0 && (
                  <Link href={`/admin/sdileni?clanek=${i.key}`} className="text-[13px] font-semibold text-muted hover:text-ink px-2">
                    Statistiky
                  </Link>
                )}
                <button
                  type="button"
                  onClick={() => setPlacementFor(placementFor === i.key ? null : i.key)}
                  className="h-9 px-3 rounded-lg text-[13px] font-semibold border border-line bg-surface text-ink hover:border-accent"
                >
                  S umístěním
                </button>
                <button
                  type="button"
                  onClick={() => copyText(i.key, i.path)}
                  className={`h-9 px-3 rounded-lg text-[13px] font-semibold border transition-colors ${copied === i.key ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-surface border-line text-ink hover:border-accent'}`}
                >
                  {copied === i.key ? 'Zkopírováno' : 'Kopírovat odkaz'}
                </button>
              </div>
              {placementFor === i.key && (
                <div className="mt-3 flex flex-wrap items-center gap-2 pl-0 sm:pl-[76px]">
                  <input
                    value={placement}
                    onChange={(e) => setPlacement(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && placement.trim() && copyWithPlacement(i)}
                    placeholder="Kde odkaz zveřejníte, např. ČSFD – diskuse k filmu X"
                    className="flex-1 min-w-[220px] h-9 bg-surface border border-line rounded-lg px-3 text-sm text-ink placeholder:text-muted outline-none focus:border-accent"
                    autoFocus
                  />
                  <button
                    type="button"
                    disabled={!placement.trim() || saving}
                    onClick={() => copyWithPlacement(i)}
                    className={`h-9 px-3 rounded-lg text-[13px] font-semibold disabled:opacity-40 ${copied === `${i.key}:p` ? 'bg-emerald-500 text-white' : 'bg-accent text-white'}`}
                  >
                    {copied === `${i.key}:p` ? 'Zkopírováno' : 'Vytvořit a zkopírovat'}
                  </button>
                  <p className="w-full text-[12px] text-muted">Každé umístění má vlastní odkaz — ve statistikách pak přesně uvidíte, kolik lidí přišlo odkud.</p>
                </div>
              )}
            </li>
          ))}
          {list.length === 0 && <li className="px-4 py-8 text-center text-sm text-muted">Žádné články.</li>}
        </ul>
      </section>

      <p className="text-[12px] text-muted leading-relaxed">
        Počítá se každé otevření článku přes sdílecí odkaz. Nepočítají se: přihlášení uživatelé, náhledy odkazů (Messenger, WhatsApp, Facebook…), roboti,
        adresy v ANALYTICS_EXCLUDE_IPS, zařízení s „Nezapočítávat“ a opakované načtení stránky do 10 minut. IP adresy se neukládají; návštěvy nelze propojit
        mezi dny. Podrobnosti se mažou po 30 dnech.
      </p>
    </div>
  );
}
