'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

// Tlačidlá dashboardu Výkon — zapnutie/vynulovanie štatistík.
export default function PerfAdminActions({ pgssEnabled }: { pgssEnabled: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState('');

  async function run(action: string, confirmText?: string) {
    if (confirmText && !confirm(confirmText)) return;
    setBusy(action);
    setMsg('');
    try {
      const res = await fetch('/api/admin/vykon', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }) });
      const data = await res.json();
      setMsg(res.ok ? data.message || 'Hotovo.' : data.error || 'Nepodarilo sa.');
      router.refresh();
    } catch {
      setMsg('Nepodarilo sa.');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2 mb-10">
      {!pgssEnabled && (
        <button onClick={() => run('enable_pgss')} disabled={!!busy} className="bg-accent text-white text-sm font-semibold px-4 py-2 rounded-full disabled:opacity-50">
          {busy === 'enable_pgss' ? 'Zapínám…' : 'Zapnout pg_stat_statements'}
        </button>
      )}
      {pgssEnabled && (
        <button onClick={() => run('reset_pgss')} disabled={!!busy} className="border border-line text-sm font-semibold px-4 py-2 rounded-full hover:border-accent disabled:opacity-50">
          {busy === 'reset_pgss' ? 'Nuluji…' : 'Vynulovat SQL statistiku'}
        </button>
      )}
      <button
        onClick={() => run('clear_stats', 'Naozaj vymazať všetky nazbierané údaje o výkone? (Hodí sa po oprave, aby si videl čisté nové čísla.)')}
        disabled={!!busy}
        className="border border-red-300 text-red-700 text-sm font-semibold px-4 py-2 rounded-full hover:bg-red-50 disabled:opacity-50"
      >
        {busy === 'clear_stats' ? 'Mažu…' : 'Smazat nasbíraná data'}
      </button>
      {msg && <span className="text-sm text-muted">{msg}</span>}
    </div>
  );
}
