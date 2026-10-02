'use client';

import { useState } from 'react';

type Req = {
  id: string;
  receivedAt: string;
  authority: string;
  referenceNo: string;
  legalBasis: string;
  scope: string;
  provided: string | null;
  status: string;
  handledBy: string;
  note: string | null;
};

const STATUS: Record<string, { label: string; cls: string }> = {
  open: { label: 'Otevřená', cls: 'bg-amber-500/15 text-amber-700' },
  done: { label: 'Vyřízená', cls: 'bg-emerald-500/15 text-emerald-700' },
  rejected: { label: 'Odmítnutá', cls: 'bg-rose-500/15 text-rose-700' }
};

const CHECKLIST = [
  'Ověřit pravost žádosti (datová schránka, zpětné volání na oficiální číslo útvaru).',
  'Zkontrolovat právní základ (např. § 8 odst. 1 tr. ř.; u provozních údajů ISP rozhoduje soud) a číslo jednací.',
  'Vydat jen požadovaný rozsah a časové okno — nic navíc.',
  'Plnou IP adresu ani totožnost web nemá (analytika ukládá jen zkrácenou podobu v nevratném kódu). Totožnost zná pouze poskytovatel připojení.',
  'Bez právního titulu nevydávat nic, ani „neformálně“. Soukromým osobám nevydávat.',
  'Vše zapsat sem — kdo žádal, co bylo vydáno, kdo vyřídil.'
];

export default function LegalRequestsAdmin({ initial }: { initial: Req[] }) {
  const [rows, setRows] = useState(initial);
  const [form, setForm] = useState({ authority: '', referenceNo: '', legalBasis: '', scope: '', receivedAt: new Date().toISOString().slice(0, 10), note: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [edit, setEdit] = useState<Record<string, string>>({});

  async function create() {
    setSaving(true);
    setError('');
    try {
      const r = await fetch('/api/admin/legal-requests', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Uložení se nezdařilo.');
      setRows((p) => [{ ...d, receivedAt: d.receivedAt }, ...p]);
      setForm({ authority: '', referenceNo: '', legalBasis: '', scope: '', receivedAt: new Date().toISOString().slice(0, 10), note: '' });
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function update(id: string, data: Partial<Req>) {
    const r = await fetch('/api/admin/legal-requests', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, ...data }) });
    if (r.ok) {
      const d = await r.json();
      setRows((p) => p.map((x) => (x.id === id ? { ...x, ...d, receivedAt: x.receivedAt } : x)));
    }
  }

  const field = 'w-full h-10 bg-surface border border-line rounded-lg px-3 text-sm text-ink outline-none focus:border-accent';

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-line bg-card p-5">
        <h2 className="text-[15px] font-semibold text-ink mb-3">Postup při obdržení žádosti</h2>
        <ol className="list-decimal pl-5 space-y-1.5 text-[13.5px] text-ink">
          {CHECKLIST.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ol>
      </section>

      <section className="rounded-2xl border border-line bg-card p-5">
        <h2 className="text-[15px] font-semibold text-ink mb-4">Zapsat novou žádost</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="block">
            <span className="block text-[12.5px] font-semibold text-ink mb-1">Orgán *</span>
            <input className={field} value={form.authority} onChange={(e) => setForm({ ...form, authority: e.target.value })} placeholder="Policie ČR, KŘP hl. m. Prahy, …" />
          </label>
          <label className="block">
            <span className="block text-[12.5px] font-semibold text-ink mb-1">Číslo jednací *</span>
            <input className={field} value={form.referenceNo} onChange={(e) => setForm({ ...form, referenceNo: e.target.value })} />
          </label>
          <label className="block">
            <span className="block text-[12.5px] font-semibold text-ink mb-1">Právní základ *</span>
            <input className={field} value={form.legalBasis} onChange={(e) => setForm({ ...form, legalBasis: e.target.value })} placeholder="např. § 8 odst. 1 tr. ř." />
          </label>
          <label className="block">
            <span className="block text-[12.5px] font-semibold text-ink mb-1">Doručeno</span>
            <input type="date" className={field} value={form.receivedAt} onChange={(e) => setForm({ ...form, receivedAt: e.target.value })} />
          </label>
          <label className="block md:col-span-2">
            <span className="block text-[12.5px] font-semibold text-ink mb-1">Rozsah požadavku *</span>
            <textarea className={`${field} h-24 py-2`} value={form.scope} onChange={(e) => setForm({ ...form, scope: e.target.value })} placeholder="Jaké údaje, za jaké období, k čemu" />
          </label>
          <label className="block md:col-span-2">
            <span className="block text-[12.5px] font-semibold text-ink mb-1">Poznámka</span>
            <input className={field} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
          </label>
        </div>
        {error && <p className="text-sm text-rose-600 mt-3">{error}</p>}
        <button type="button" onClick={create} disabled={saving} className="mt-4 h-10 px-4 rounded-lg bg-accent text-white text-[13.5px] font-semibold disabled:opacity-50">
          {saving ? 'Ukládám…' : 'Zapsat žádost'}
        </button>
      </section>

      <section className="rounded-2xl border border-line bg-card">
        <div className="px-5 py-4 border-b border-line">
          <h2 className="text-[15px] font-semibold text-ink">Evidence ({rows.length})</h2>
        </div>
        {rows.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-muted">Zatím žádné žádosti.</p>
        ) : (
          <ul className="divide-y divide-line">
            {rows.map((r) => (
              <li key={r.id} className="px-5 py-4 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-ink">{r.authority}</span>
                  <span className="text-[12.5px] text-muted">
                    č. j. {r.referenceNo} · {new Date(r.receivedAt).toLocaleDateString('cs-CZ')} · vyřizuje {r.handledBy}
                  </span>
                  <span className={`ml-auto text-[11px] font-semibold rounded-full px-2.5 py-0.5 ${STATUS[r.status]?.cls || ''}`}>{STATUS[r.status]?.label || r.status}</span>
                </div>
                <div className="text-[13px] text-ink">
                  <span className="text-muted">Právní základ:</span> {r.legalBasis}
                </div>
                <div className="text-[13px] text-ink whitespace-pre-line">
                  <span className="text-muted">Požadováno:</span> {r.scope}
                </div>
                <div className="flex flex-wrap items-start gap-2">
                  <textarea
                    className="flex-1 min-w-[240px] h-16 bg-surface border border-line rounded-lg px-3 py-2 text-[13px] text-ink outline-none focus:border-accent"
                    placeholder="Co bylo vydáno (rozsah, forma, datum)"
                    value={edit[r.id] ?? r.provided ?? ''}
                    onChange={(e) => setEdit({ ...edit, [r.id]: e.target.value })}
                  />
                  <div className="flex flex-col gap-2">
                    <button type="button" onClick={() => update(r.id, { provided: edit[r.id] ?? r.provided ?? '', status: 'done' })} className="h-9 px-3 rounded-lg bg-accent text-white text-[13px] font-semibold">
                      Uložit jako vyřízené
                    </button>
                    <button type="button" onClick={() => update(r.id, { status: 'rejected' })} className="h-9 px-3 rounded-lg border border-line text-[13px] font-semibold text-ink hover:border-rose-500 hover:text-rose-600">
                      Odmítnout
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
