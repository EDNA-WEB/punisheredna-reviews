'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Revision = { id: string; title: string; body: string; createdAt: string; editedBy: { name: string } };

export default function RevisionHistory({ apiBase }: { apiBase: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [revisions, setRevisions] = useState<Revision[] | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [restoring, setRestoring] = useState<string | null>(null);

  async function loadRevisions() {
    setOpen((o) => !o);
    if (revisions !== null) return;
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/revisions`);
      const data = await res.json();
      setRevisions(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }

  async function restore(revisionId: string) {
    if (!confirm('Naozaj sa chceš vrátiť k tejto staršej verzii? Súčasný stav sa uloží ako nová história, takže sa dá vrátiť aj sem naspäť.')) return;
    setRestoring(revisionId);
    try {
      const res = await fetch(`${apiBase}/revisions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ revisionId })
      });
      if (!res.ok) throw new Error();
      alert('Obnovené. Stránka sa teraz znovu načíta s touto verziou.');
      window.location.reload();
    } catch {
      alert('Obnovenie zlyhalo. Skús to prosím znova.');
    } finally {
      setRestoring(null);
    }
  }

  return (
    <div className="border border-line rounded-xl p-4 bg-surface">
      <button type="button" onClick={loadRevisions} className="text-sm font-semibold text-accent hover:underline">
        {open ? 'Skryť históriu verzií ▴' : 'História verzií ▾'}
      </button>

      {open && (
        <div className="mt-3">
          {loading ? (
            <p className="text-xs text-muted">Načítavam…</p>
          ) : !revisions || revisions.length === 0 ? (
            <p className="text-xs text-muted">Zatiaľ žiadna staršia verzia — história sa začne ukladať po prvej úprave.</p>
          ) : (
            <ul className="space-y-2">
              {revisions.map((r) => (
                <li key={r.id} className="border border-line rounded-lg p-2.5 bg-card">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="text-xs text-ink">
                      <span className="font-semibold">{r.title}</span>
                      <span className="text-muted"> · upravil(a) {r.editedBy?.name || 'neznámy'} · {new Date(r.createdAt).toLocaleString('sk-SK')}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-none">
                      <button
                        type="button"
                        onClick={() => setExpandedId((cur) => (cur === r.id ? null : r.id))}
                        className="text-[11px] font-semibold text-accent hover:underline"
                      >
                        {expandedId === r.id ? 'Skryť text' : 'Zobraziť text'}
                      </button>
                      <button
                        type="button"
                        onClick={() => restore(r.id)}
                        disabled={restoring === r.id}
                        className="text-[11px] font-semibold text-white bg-accent px-2.5 py-1 rounded-full hover:bg-accent-dark disabled:opacity-50"
                      >
                        {restoring === r.id ? '…' : 'Obnoviť túto verziu'}
                      </button>
                    </div>
                  </div>
                  {expandedId === r.id && (
                    <div className="mt-2 pt-2 border-t border-line text-xs text-muted whitespace-pre-wrap max-h-48 overflow-y-auto">
                      {r.body}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
