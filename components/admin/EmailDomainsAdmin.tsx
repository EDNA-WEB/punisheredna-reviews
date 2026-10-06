'use client';

import { useEffect, useState } from 'react';

type Rule = { domain: string; allow: boolean; note: string | null; createdAt: string };
type Stats = { blocked: number; remote: number; loadedAt: string };

export default function EmailDomainsAdmin() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [domain, setDomain] = useState('');
  const [allow, setAllow] = useState(false);
  const [test, setTest] = useState('');
  const [testResult, setTestResult] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function load() {
    const res = await fetch('/api/admin/email-domains');
    if (!res.ok) return setError('Nepodařilo se načíst.');
    const d = await res.json();
    setRules(d.rules);
    setStats(d.stats);
  }
  useEffect(() => {
    load();
  }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/admin/email-domains', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ domain, allow }) });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      setDomain('');
      await load();
    } catch (e: any) {
      setError(e.message || 'Uložení se nezdařilo.');
    } finally {
      setBusy(false);
    }
  }

  async function remove(d: string) {
    if (!confirm(`Odebrat ${d} ze seznamu?`)) return;
    await fetch(`/api/admin/email-domains?domain=${encodeURIComponent(d)}`, { method: 'DELETE' });
    await load();
  }

  async function runTest(e: React.FormEvent) {
    e.preventDefault();
    setTestResult('Ověřuji…');
    const res = await fetch(`/api/admin/email-domains?test=${encodeURIComponent(test)}`);
    const d = await res.json().catch(() => ({}));
    setTestResult(d.result?.ok ? 'Povoleno — s touto adresou se registrovat lze.' : `Blokováno — ${d.result?.message || 'chyba'}`);
  }

  const input = 'h-10 px-3 rounded-lg border border-line bg-card text-ink text-sm focus:outline-none focus:border-accent';
  const btn = 'h-10 px-4 rounded-lg bg-accent text-white text-sm font-semibold hover:bg-accent-dark disabled:opacity-50';

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="border border-line rounded-xl bg-card p-5 text-sm">
        <p className="text-ink">
          Registrace s dočasnými e-maily je blokovaná automaticky. Komunitní seznamy se obnovují každých 12 hodin
          {stats ? (
            <>
              {' '}— nyní <b>{new Intl.NumberFormat('cs-CZ').format(stats.blocked)}</b> blokovaných domén
              {stats.remote === 0 ? <span className="text-amber-600"> (komunitní seznamy se teď nepodařilo stáhnout, platí vestavěný seznam)</span> : null}.
            </>
          ) : (
            '.'
          )}
        </p>
        <p className="text-muted mt-2">Kontroluje se i poštovní server domény, takže se zachytí i nové domény dočasných služeb. Pokud něco proklouzne, přidej doménu níže.</p>
      </div>

      <form onSubmit={runTest} className="border border-line rounded-xl bg-card p-5">
        <h2 className="font-semibold text-ink mb-3">Otestovat adresu nebo doménu</h2>
        <div className="flex flex-wrap gap-2">
          <input className={`${input} flex-1 min-w-[220px]`} value={test} onChange={(e) => setTest(e.target.value)} placeholder="napr. nekdo@temp-mail.org" />
          <button className={btn} disabled={!test.trim()}>Otestovat</button>
        </div>
        {testResult && <p className="text-sm mt-3 text-ink">{testResult}</p>}
      </form>

      <form onSubmit={add} className="border border-line rounded-xl bg-card p-5">
        <h2 className="font-semibold text-ink mb-3">Přidat doménu</h2>
        <div className="flex flex-wrap items-center gap-2">
          <input className={`${input} flex-1 min-w-[220px]`} value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="priklad.cz" />
          <select className={input} value={allow ? 'allow' : 'block'} onChange={(e) => setAllow(e.target.value === 'allow')}>
            <option value="block">Blokovat</option>
            <option value="allow">Vždy povolit</option>
          </select>
          <button className={btn} disabled={busy || !domain.trim()}>Uložit</button>
        </div>
        <p className="text-xs text-muted mt-2">„Vždy povolit“ použij, když se omylem zablokuje skutečný poskytovatel e-mailu.</p>
        {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
      </form>

      <div className="border border-line rounded-xl bg-card overflow-hidden">
        <div className="px-5 py-3 border-b border-line font-semibold text-ink">Vlastní seznam ({rules.length})</div>
        {rules.length === 0 ? (
          <p className="px-5 py-6 text-sm text-muted">Zatím žádné vlastní domény.</p>
        ) : (
          <ul className="divide-y divide-line">
            {rules.map((r) => (
              <li key={r.domain} className="flex items-center gap-3 px-5 py-2.5 text-sm">
                <span className="flex-1 text-ink">{r.domain}</span>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${r.allow ? 'bg-emerald-500/15 text-emerald-600' : 'bg-red-500/15 text-red-600'}`}>
                  {r.allow ? 'povoleno' : 'blokováno'}
                </span>
                <button onClick={() => remove(r.domain)} className="text-xs text-muted hover:text-red-600">
                  Odebrat
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
