'use client';

import { useState } from 'react';

type UserItem = { id: string; name: string; isEditor: boolean };

export default function RightsAdminList({ initialUsers }: { initialUsers: UserItem[] }) {
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState(initialUsers);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const filtered = query.trim()
    ? users.filter((u) => u.name.toLowerCase().includes(query.trim().toLowerCase()))
    : users.filter((u) => u.isEditor);

  async function toggle(userId: string, next: boolean) {
    setSavingId(userId);
    setError('');
    try {
      const res = await fetch('/api/admin/rights/set-editor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, isEditor: next })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Zmena zlyhala.');
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, isEditor: next } : u)));
    } catch (err: any) {
      setError(err.message || 'Zmena zlyhala.');
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="max-w-xl">
      <div className="border border-line rounded-xl p-5 bg-card mb-6">
        <h2 className="text-sm font-bold text-ink mb-1">Redaktor</h2>
        <p className="text-xs text-muted mb-4">
          Vidí tlačidlo Administrácia, no smie v nej len pridávať novinky — nič iné tu nie je dostupné. V profile sa
          mu zobrazí označenie "Redaktor".
        </p>
        <input
          className="field-input-sm w-full mb-3"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Vyhľadaj prezývku…"
        />
        {error && <p className="text-danger text-xs mb-2">{error}</p>}

        <div className="border border-line rounded-lg divide-y divide-line max-h-96 overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="text-xs text-muted p-3">
              {query.trim() ? 'Nikto nenájdený.' : 'Zatiaľ nikto nemá právo redaktora — vyhľadaj používateľa vyššie.'}
            </p>
          ) : (
            filtered.map((u) => (
              <div key={u.id} className="flex items-center gap-3 p-3">
                <span className="text-sm text-ink flex-1 truncate">{u.name}</span>
                <button
                  type="button"
                  onClick={() => toggle(u.id, !u.isEditor)}
                  disabled={savingId === u.id}
                  className={`text-xs font-semibold rounded-full px-3 py-1.5 disabled:opacity-50 ${
                    u.isEditor
                      ? 'text-danger border border-danger/40 hover:bg-danger/10'
                      : 'text-accent border border-accent/40 hover:bg-accent/10'
                  }`}
                >
                  {savingId === u.id ? '…' : u.isEditor ? 'Odobrať redaktora' : 'Nastaviť ako redaktora'}
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
