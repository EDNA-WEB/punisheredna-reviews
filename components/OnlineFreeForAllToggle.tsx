'use client';

import { useState } from 'react';

export default function OnlineFreeForAllToggle({ initialEnabled }: { initialEnabled: boolean }) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [loading, setLoading] = useState(false);

  async function toggle() {
    const next = !enabled;
    setLoading(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ onlineFreeForAll: next })
      });
      if (!res.ok) throw new Error();
      setEnabled(next);
    } catch {
      alert('Zmena zlyhala. Skús to prosím znova.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="border border-line rounded-xl p-4 bg-surface flex items-center justify-between gap-4 max-w-xl">
      <div>
        <div className="text-sm font-semibold text-ink">Online sledovanie zdarma pre všetkých</div>
        <p className="text-xs text-muted mt-0.5">
          {enabled
            ? 'Momentálne zapnuté — sekciu "Online" vidí a môže kliknúť ktokoľvek, aj neprihlásení návštevníci, bez ohľadu na členstvo.'
            : 'Momentálne vypnuté — sekcia "Online" je dostupná len prihláseným Golden Ticket členom, tak ako obvykle.'}
        </p>
      </div>
      <button
        type="button"
        onClick={toggle}
        disabled={loading}
        className={`text-xs font-bold px-4 py-2 rounded-full flex-none whitespace-nowrap disabled:opacity-50 ${
          enabled ? 'border border-line text-muted hover:border-danger hover:text-danger' : 'bg-accent text-white hover:bg-accent-dark'
        }`}
      >
        {loading ? '…' : enabled ? 'Vypnúť' : 'Zapnúť pre všetkých'}
      </button>
    </div>
  );
}
