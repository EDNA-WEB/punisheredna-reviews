'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const PRESETS = [
  { label: '+1 mesiac', days: 30 },
  { label: '+3 mesiace', days: 90 },
  { label: '+1 rok', days: 365 }
];

export default function MembershipDirectSetForm() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [customDate, setCustomDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  function dateFromDays(days: number): string {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString();
  }

  async function apply(until: string) {
    if (!username.trim()) {
      setError('Zadaj prosím prezývku používateľa.');
      return;
    }
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/admin/membership/set', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), until })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Nastavenie zlyhalo.');
      setSuccess(`Členstvo pre "${data.name}" nastavené do ${new Date(data.membershipUntil).toLocaleDateString('sk-SK')}.`);
      setUsername('');
      setCustomDate('');
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="border border-line rounded-xl p-4 space-y-3">
      <h2 className="text-sm font-bold text-ink">Priamo nastaviť členstvo</h2>
      <p className="text-xs text-muted">
        Okamžite nastaví členstvo bez potreby kódu — použi napríklad hneď po tom, čo si sám overil platbu.
      </p>
      <input
        className="field-input-sm w-full"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        placeholder="Prezývka používateľa"
      />
      <div className="flex items-center gap-2 flex-wrap">
        {PRESETS.map((p) => (
          <button
            key={p.label}
            type="button"
            onClick={() => apply(dateFromDays(p.days))}
            disabled={loading}
            className="border border-line text-ink text-xs font-semibold px-3 py-2 rounded-full hover:border-accent hover:text-accent disabled:opacity-50"
          >
            {p.label}
          </button>
        ))}
        <input
          type="date"
          className="field-input-sm w-auto"
          value={customDate}
          onChange={(e) => setCustomDate(e.target.value)}
        />
        <button
          type="button"
          onClick={() => customDate && apply(new Date(customDate).toISOString())}
          disabled={loading || !customDate}
          className="bg-accent text-white text-xs font-semibold px-4 py-2 rounded-full hover:bg-accent-dark disabled:opacity-50"
        >
          Nastaviť na dátum
        </button>
      </div>
      {error && <p className="text-danger text-xs">{error}</p>}
      {success && <p className="text-emerald-600 text-xs font-semibold">{success}</p>}
    </div>
  );
}
