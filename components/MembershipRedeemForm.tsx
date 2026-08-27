'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function MembershipRedeemForm({ membershipUntil }: { membershipUntil: string | null }) {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const until = membershipUntil ? new Date(membershipUntil) : null;
  const isActive = until !== null && until > new Date();
  const daysLeft = isActive ? Math.ceil((until!.getTime() - Date.now()) / (24 * 60 * 60 * 1000)) : 0;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/membership/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Uplatnenie kódu zlyhalo.');
      setSuccess(`Členstvo aktivované! Platí do ${new Date(data.until).toLocaleDateString('sk-SK')}.`);
      setCode('');
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-lg">
      <div className="border border-line rounded-xl overflow-hidden mb-6">
        <div className="bg-surface px-4 py-2.5 border-b border-line flex items-center gap-2">
          <img src="/golden-ticket-badge.svg" alt="" width={22} height={22} />
          <h2 className="text-sm font-bold text-ink">Golden Ticket členstvo</h2>
        </div>
        <div className="p-4">
          {isActive ? (
            <div className="flex items-center gap-4">
              <img src="/golden-ticket-large.svg" alt="Golden Ticket" className="w-40 flex-none" />
              <div>
                <p className="text-sm font-semibold text-ink">Si aktívny Golden Ticket člen!</p>
                <p className="text-sm text-muted mt-1">
                  Platí ešte {daysLeft} {daysLeft === 1 ? 'deň' : daysLeft < 5 ? 'dni' : 'dní'}, do{' '}
                  <span className="font-semibold text-ink">{until!.toLocaleDateString('sk-SK')}</span>.
                </p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted">
              Momentálne nie si Golden Ticket člen. Kód na skúšobnú alebo platenú verziu ti príde do{' '}
              <a href="/spravy" className="text-accent font-semibold hover:underline">Pošty</a>, prípadne ho zadaj priamo tu.
            </p>
          )}
        </div>
      </div>

      <form onSubmit={submit} className="border border-line rounded-xl p-4">
        <label className="block text-sm font-semibold text-ink mb-2">Uplatniť kód členstva</label>
        <div className="flex items-center gap-2">
          <input
            className="field-input flex-1 uppercase tracking-widest"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="napr. XK7P2QRT9M"
            maxLength={14}
          />
          <button
            type="submit"
            disabled={loading || !code.trim()}
            className="bg-accent text-white px-5 py-2.5 rounded-full text-sm font-semibold hover:bg-accent-dark disabled:opacity-50 flex-none"
          >
            {loading ? 'Overujem…' : 'Uplatniť'}
          </button>
        </div>
        {error && <p className="text-danger text-sm mt-2">{error}</p>}
        {success && <p className="text-emerald-600 text-sm font-semibold mt-2">{success}</p>}
      </form>
    </div>
  );
}
