'use client';

import { useState } from 'react';

export default function RegistrationsToggle({ initialEnabled }: { initialEnabled: boolean }) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [loading, setLoading] = useState(false);

  async function toggle() {
    const next = !enabled;
    setLoading(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ registrationsEnabled: next })
      });
      if (!res.ok) throw new Error();
      setEnabled(next);
    } catch {
      alert('Změna se nezdařila. Zkus to prosím znovu.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="border border-line rounded-xl p-4 bg-surface flex items-center justify-between gap-4 max-w-xl">
      <div>
        <div className="text-sm font-semibold text-ink">Registrace nových účtů</div>
        <p className="text-xs text-muted mt-0.5">
          {enabled
            ? 'Registrace je momentálně povolená — kdokoli si může vytvořit nový účet.'
            : 'Registrace je momentálně vypnutá. Stávající uživatelé se nadále přihlásí bez omezení.'}
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
        {loading ? '…' : enabled ? 'Vypnout registrace' : 'Zapnout registrace'}
      </button>
    </div>
  );
}
