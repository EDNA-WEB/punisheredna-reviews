'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type MemberItem = { id: string; name: string; membershipUntil: string };

export default function MembershipOverviewTable({ initialMembers }: { initialMembers: MemberItem[] }) {
  const router = useRouter();
  const [members, setMembers] = useState(initialMembers);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  async function revoke(userId: string) {
    const confirmed = confirm('Naozaj chceš tomuto používateľovi okamžite vypnúť členstvo?');
    if (!confirmed) return;

    setRevokingId(userId);
    try {
      const res = await fetch('/api/admin/membership/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
      if (!res.ok) throw new Error();
      setMembers((prev) => prev.filter((m) => m.id !== userId));
      router.refresh();
    } catch {
      alert('Vypnutie členstva zlyhalo. Skús to prosím znova.');
    } finally {
      setRevokingId(null);
    }
  }

  const now = new Date();

  return (
    <div>
      <h2 className="text-sm font-bold text-ink mb-3">Prehľad členstiev</h2>
      <div className="border border-line rounded-xl overflow-hidden divide-y divide-line">
        {members.length === 0 ? (
          <p className="text-sm text-muted p-4">Zatiaľ nikto nemá nastavené členstvo.</p>
        ) : (
          members.map((m) => {
            const until = new Date(m.membershipUntil);
            const active = until > now;
            return (
              <div key={m.id} className="flex items-center gap-3 p-3 text-sm flex-wrap">
                <span className="font-semibold text-ink">{m.name}</span>
                <span
                  className={`text-xs border rounded-full px-2 py-0.5 ${
                    active ? 'text-emerald-600 border-emerald-600/40' : 'text-muted border-line'
                  }`}
                >
                  {active ? 'Aktívne' : 'Vypršané'} — do {until.toLocaleDateString('sk-SK')}
                </span>
                <button
                  type="button"
                  onClick={() => revoke(m.id)}
                  disabled={revokingId === m.id}
                  className="ml-auto text-xs font-semibold text-danger border border-danger/40 rounded-full px-3 py-1.5 hover:bg-danger/10 disabled:opacity-50"
                >
                  {revokingId === m.id ? 'Vypínam…' : 'Vypnúť členstvo'}
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
