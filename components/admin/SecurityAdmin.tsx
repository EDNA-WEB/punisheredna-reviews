'use client';

import { useEffect, useState } from 'react';

type RegData = {
  summary: { today: number; todayOk: number; week: number; weekPrev: number; ok30: number; fail30: number; okShare: number };
  reasons: { key: string; label: string; count: number }[];
  days: { day: string; ok: number; fail: number }[];
  recent: { id: string; createdAt: string; source: string; result: string; emailMasked: string | null; label: string }[];
};
type Row = { id: string; createdAt: string; action: string; label: string; ip: string; device: string };
type Legal = { id: string; receivedAt: string; authority: string; referenceNo: string; provided: string | null; handledBy: string };

const RESULT_STYLE: Record<string, string> = {
  ok: 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30',
  disposable: 'bg-red-500/15 text-red-500 border-red-500/30',
  bot: 'bg-red-500/15 text-red-500 border-red-500/30',
  rate_limit: 'bg-amber-500/15 text-amber-500 border-amber-500/30',
  exists: 'bg-orange-500/15 text-orange-500 border-orange-500/30',
  disabled: 'bg-gray-500/15 text-muted border-line',
  invalid: 'bg-gray-500/15 text-muted border-line',
  error: 'bg-red-500/15 text-red-500 border-red-500/30'
};

const fmtTime = (iso: string) =>
  new Date(iso).toLocaleString('cs-CZ', { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' });
const nf = (n: number) => new Intl.NumberFormat('cs-CZ').format(n);

const card = 'border border-line rounded-xl bg-card';
const input = 'h-10 px-3 rounded-lg border border-line bg-card text-ink text-sm focus:outline-none focus:border-accent';
const btn = 'h-10 px-4 rounded-lg bg-accent text-white text-sm font-semibold hover:bg-accent-dark disabled:opacity-50';

export default function SecurityAdmin() {
  const [tab, setTab] = useState<'reg' | 'ip'>('reg');
  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        {(
          [
            ['reg', 'Pokusy o registraci'],
            ['ip', 'IP záznamy (pro policii)']
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            type="button"
            onClick={() => setTab(k)}
            className={`px-4 py-2 rounded-full text-sm font-semibold border ${tab === k ? 'bg-accent text-white border-accent' : 'border-line text-ink hover:border-accent'}`}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === 'reg' ? <Registrations /> : <IpLogs />}
    </div>
  );
}

function Tile({ label, value, sub, tone }: { label: string; value: string; sub: string; tone?: 'ok' | 'bad' }) {
  return (
    <div className={`${card} p-4 flex-1 min-w-[180px]`}>
      <div className="text-xs font-semibold text-muted">{label}</div>
      <div className={`text-3xl font-extrabold mt-1 ${tone === 'ok' ? 'text-emerald-500' : tone === 'bad' ? 'text-red-500' : 'text-ink'}`}>{value}</div>
      <div className="text-xs text-muted mt-1">{sub}</div>
    </div>
  );
}

function Registrations() {
  const [data, setData] = useState<RegData | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/admin/security/registrations')
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || 'Nepodařilo se načíst.');
        setData(d);
      })
      .catch((e) => setError(e.message || 'Nepodařilo se načíst.'));
  }, []);

  if (error) return <p className="text-sm text-red-500">{error}</p>;
  if (!data) return <div className={`${card} h-40 animate-pulse`} />;

  const s = data.summary;
  const trend = s.weekPrev ? Math.round(((s.week - s.weekPrev) / s.weekPrev) * 100) : null;
  const max = Math.max(1, ...data.days.map((d) => d.ok + d.fail));

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">Každý pokus o registraci z webu i appky, i ten neúspěšný.</p>
      <div className="flex flex-wrap gap-3">
        <Tile label="Dnes" value={nf(s.today)} sub={`${nf(s.todayOk)} úspěšných · ${nf(s.today - s.todayOk)} neúspěšných`} />
        <Tile
          label="Posledních 7 dní"
          value={nf(s.week)}
          sub={trend === null ? 'minulý týden bez pokusů' : `${trend >= 0 ? '+' : ''}${trend} % oproti minulému týdnu`}
        />
        <Tile label="Úspěšné (30 dní)" value={nf(s.ok30)} sub={`${s.okShare} % všech pokusů`} tone="ok" />
        <Tile label="Zablokované (30 dní)" value={nf(s.fail30)} sub="dočasné e-maily, limity, roboti" tone="bad" />
      </div>

      <div className="flex flex-wrap gap-3">
        <div className={`${card} p-4 flex-[2] min-w-[300px]`}>
          <div className="flex items-end gap-2 h-32">
            {data.days.map((d) => (
              <div key={d.day} className="flex-1 flex flex-col justify-end h-full" title={`${d.day}: ${d.ok} úspěšných, ${d.fail} neúspěšných`}>
                <div className="bg-emerald-500 rounded-t-sm" style={{ height: `${(d.ok / max) * 100}%` }} />
                <div className="bg-red-500/85 rounded-b-sm" style={{ height: `${(d.fail / max) * 100}%` }} />
              </div>
            ))}
          </div>
          <div className="flex gap-2 mt-1">
            {data.days.map((d) => (
              <div key={d.day} className="flex-1 text-center text-[10px] text-muted">
                {Number(d.day.slice(8))}.
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-4 text-xs text-muted mt-3">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" /> Úspěšné</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-red-500" /> Neúspěšné / zablokované</span>
            <span className="ml-auto">posledních 14 dní</span>
          </div>
        </div>
        <div className={`${card} p-4 flex-1 min-w-[240px] text-sm`}>
          <div className="font-bold text-ink mb-2">Důvody neúspěchu (30 dní)</div>
          {data.reasons.map((r) => (
            <div key={r.key} className="flex justify-between py-1.5 border-t border-line">
              <span className="text-ink">{r.label}</span>
              <b className="text-ink">{nf(r.count)}</b>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center pt-2">
        <h2 className="font-bold text-ink">Poslední pokusy</h2>
        <a href="/api/admin/security/registrations?format=csv" className="ml-auto text-sm font-semibold text-accent hover:underline">
          Export CSV (30 dní)
        </a>
      </div>
      <div className={`${card} overflow-x-auto`}>
        {data.recent.length === 0 ? (
          <p className="px-5 py-6 text-sm text-muted">Zatím žádné pokusy. Zaznamenávají se od nasazení této funkce.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted">
                <th className="px-4 py-2.5 font-semibold">Čas</th>
                <th className="px-4 py-2.5 font-semibold">E-mail</th>
                <th className="px-4 py-2.5 font-semibold">Odkud</th>
                <th className="px-4 py-2.5 font-semibold">Výsledek</th>
              </tr>
            </thead>
            <tbody>
              {data.recent.map((r) => (
                <tr key={r.id} className="border-t border-line">
                  <td className="px-4 py-2.5 text-ink whitespace-nowrap">{fmtTime(r.createdAt)}</td>
                  <td className="px-4 py-2.5 text-ink">{r.emailMasked || '—'}</td>
                  <td className="px-4 py-2.5 text-ink">{r.source === 'app' ? 'Appka' : 'Web'}</td>
                  <td className="px-4 py-2.5">
                    <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full border ${RESULT_STYLE[r.result] || RESULT_STYLE.invalid}`}>{r.label}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function IpLogs() {
  const today = new Date().toLocaleDateString('sv-SE');
  const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60_000).toLocaleDateString('sv-SE');
  const [q, setQ] = useState('');
  const [from, setFrom] = useState(monthAgo);
  const [to, setTo] = useState(today);
  const [user, setUser] = useState<{ id: string; name: string } | null>(null);
  const [hold, setHold] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [legal, setLegal] = useState<Legal[]>([]);
  const [authority, setAuthority] = useState('');
  const [referenceNo, setReferenceNo] = useState('');
  const [legalBasis, setLegalBasis] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [searched, setSearched] = useState(false);

  async function load(query = q) {
    setError('');
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/security/activity?user=${encodeURIComponent(query)}&from=${from}&to=${to}`);
      const d = await res.json();
      if (d.legal) setLegal(d.legal);
      if (!res.ok) throw new Error(d.error || 'Nepodařilo se načíst.');
      setUser(d.user);
      setRows(d.rows || []);
      setHold(!!d.hold);
      setSearched(!!query.trim());
    } catch (e: any) {
      setUser(null);
      setRows([]);
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    load('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function toggleHold() {
    if (!user) return;
    const next = !hold;
    if (next && !confirm(`Zastavit automatické mazání IP záznamů uživatele ${user.name}? Záznamy zůstanou uložené, dokud to zase nepovolíš.`)) return;
    const res = await fetch('/api/admin/security/activity', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: user.id, hold: next }) });
    if (res.ok) setHold(next);
  }

  async function reveal(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setError('');
    setBusy(true);
    try {
      const res = await fetch('/api/admin/security/activity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, from, to, authority, referenceNo, legalBasis })
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Nepodařilo se vytvořit výpis.');
      window.open(`/admin/bezpecnost/vypis/${d.id}`, '_blank');
      setAuthority('');
      setReferenceNo('');
      setLegalBasis('');
      load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">
        Jen pro vyžádání orgánů činných v trestním řízení. Ukládá se přihlášení, recenze, komentáře, příspěvky a soukromé zprávy. Záznamy se
        automaticky mažou po 6 měsících.
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          load();
        }}
        className="flex flex-wrap gap-2"
      >
        <input className={`${input} flex-1 min-w-[220px]`} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Přezdívka, e-mail nebo ID uživatele" />
        <input type="date" className={input} value={from} onChange={(e) => setFrom(e.target.value)} />
        <input type="date" className={input} value={to} onChange={(e) => setTo(e.target.value)} />
        <button className={btn} disabled={busy || !q.trim()}>Vyhledat</button>
      </form>

      {error && <p className="text-sm text-red-500">{error}</p>}

      {user && (
        <>
          <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-300 px-4 py-3 text-sm">
            Celé IP adresy se zobrazí až po zadání úřední žádosti. Každý výpis se eviduje (kdo, kdy, číslo jednací).
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="text-ink font-semibold">
              {user.name} <span className="text-muted font-normal">· {rows.length} záznamů v období</span>
            </div>
            <button type="button" onClick={toggleHold} className={`ml-auto text-sm font-semibold ${hold ? 'text-emerald-500' : 'text-red-500'} hover:underline`}>
              {hold ? 'Mazání zastaveno — povolit znovu' : 'Zabránit smazání záznamů tohoto uživatele'}
            </button>
          </div>

          <div className={`${card} overflow-x-auto`}>
            {rows.length === 0 ? (
              <p className="px-5 py-6 text-sm text-muted">V tomto období nejsou žádné záznamy. Ukládají se od nasazení této funkce.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted">
                    <th className="px-4 py-2.5 font-semibold">Čas</th>
                    <th className="px-4 py-2.5 font-semibold">Činnost</th>
                    <th className="px-4 py-2.5 font-semibold">IP adresa</th>
                    <th className="px-4 py-2.5 font-semibold">Zařízení</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="border-t border-line">
                      <td className="px-4 py-2.5 text-ink whitespace-nowrap">{fmtTime(r.createdAt)}</td>
                      <td className="px-4 py-2.5 text-ink">{r.label}</td>
                      <td className="px-4 py-2.5 text-ink font-mono whitespace-nowrap">{r.ip}</td>
                      <td className="px-4 py-2.5 text-ink whitespace-nowrap">{r.device}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <form onSubmit={reveal} className={`${card} p-4 space-y-3`}>
            <h2 className="font-bold text-ink">Úřední žádost — výpis s celými IP adresami</h2>
            <div className="flex flex-wrap gap-2">
              <input className={`${input} flex-1 min-w-[220px]`} value={authority} onChange={(e) => setAuthority(e.target.value)} placeholder="Orgán (např. Policie ČR, KŘP Praha)" />
              <input className={`${input} flex-1 min-w-[220px]`} value={referenceNo} onChange={(e) => setReferenceNo(e.target.value)} placeholder="Číslo jednací žádosti" />
            </div>
            <input className={`${input} w-full`} value={legalBasis} onChange={(e) => setLegalBasis(e.target.value)} placeholder="Právní základ (nepovinné, např. § 8 trestního řádu)" />
            <div className="flex flex-wrap items-center gap-3">
              <button className={btn} disabled={busy || !authority.trim() || referenceNo.trim().length < 3}>
                Zobrazit celé IP a vytvořit výpis
              </button>
              <span className="text-xs text-muted">Výpis se otevře v nové kartě, odtud ho uložíš jako PDF.</span>
            </div>
          </form>
        </>
      )}

      {!user && !searched && !error && <p className="text-sm text-muted">Vyhledej uživatele podle přezdívky, e-mailu nebo ID.</p>}

      {legal.length > 0 && (
        <div className={`${card} overflow-x-auto`}>
          <div className="px-4 py-3 border-b border-line font-bold text-ink text-sm">Evidované žádosti</div>
          <table className="w-full text-sm">
            <tbody>
              {legal.map((l) => (
                <tr key={l.id} className="border-t border-line first:border-t-0">
                  <td className="px-4 py-2.5 text-ink whitespace-nowrap">{fmtTime(l.receivedAt)}</td>
                  <td className="px-4 py-2.5 text-ink">{l.authority}</td>
                  <td className="px-4 py-2.5 text-ink">{l.referenceNo}</td>
                  <td className="px-4 py-2.5 text-muted">{l.provided}</td>
                  <td className="px-4 py-2.5 text-right">
                    <a href={`/admin/bezpecnost/vypis/${l.id}`} target="_blank" className="text-accent font-semibold hover:underline">
                      Otevřít výpis
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
