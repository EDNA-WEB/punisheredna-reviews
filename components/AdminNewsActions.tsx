'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function AdminNewsActions({ id, slug }: { id: string; slug: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [mailing, setMailing] = useState(false);
  const [mailed, setMailed] = useState<string | null>(null);

  async function handleDelete() {
    if (!confirm('Opravdu chceš tuto novinku natrvalo smazat?')) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/news/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      alert('Smazání se nezdařilo. Zkus to prosím znovu.');
    } finally {
      setLoading(false);
    }
  }

  // Odoslanie novinky e-mailom všetkým, ktorí majú zapnuté „Novinky z KrálFilmu“.
  async function handleEmail(force = false) {
    if (!force && !confirm('Odeslat tuto novinku e-mailem všem odběratelům novinek?')) return;
    setMailing(true);
    try {
      const res = await fetch(`/api/admin/news/${id}/email${force ? '?force=1' : ''}`, { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (res.status === 409 && data.emailedAt) {
        const when = new Date(data.emailedAt).toLocaleString('cs-CZ');
        if (confirm(`Tato novinka už byla odeslána ${when}. Odeslat znovu?`)) return handleEmail(true);
        return;
      }
      if (!res.ok) throw new Error(data.error || 'Odeslání se nezdařilo.');
      setMailed(`Odesláno: ${data.sent} z ${data.recipients}`);
    } catch (e: any) {
      alert(e.message || 'Odeslání se nezdařilo.');
    } finally {
      setMailing(false);
    }
  }

  return (
    <div className="flex items-center gap-4 text-xs font-semibold flex-none">
      <Link href={`/news/${slug}`} className="text-muted hover:text-accent">Zobrazit</Link>
      <Link href={`/admin/news/${id}/edit`} className="text-muted hover:text-accent">Upravit</Link>
      {mailed ? (
        <span className="text-emerald-600">{mailed}</span>
      ) : (
        <button onClick={() => handleEmail()} disabled={mailing} className="text-muted hover:text-accent disabled:opacity-50">
          {mailing ? 'Odesílám…' : 'Odeslat e-mailem'}
        </button>
      )}
      <button onClick={handleDelete} disabled={loading} className="text-muted hover:text-danger disabled:opacity-50">
        Smazat
      </button>
    </div>
  );
}
