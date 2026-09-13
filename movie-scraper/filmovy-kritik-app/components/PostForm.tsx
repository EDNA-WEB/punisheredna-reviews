'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function PostForm({ threadId }: { threadId: string }) {
  const { data: session } = useSession();
  const router = useRouter();
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!session) {
    return (
      <div className="border border-line rounded-xl p-5 text-center text-muted text-sm bg-surface">
        <Link href="/login" className="text-accent font-semibold hover:underline">Prihlás sa</Link>
        {' '}alebo{' '}
        <Link href="/register" className="text-accent font-semibold hover:underline">zaregistruj sa</Link>
        {' '}a zapoj sa do diskusie.
      </div>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ threadId, body: text })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Odoslanie zlyhalo.');
      setText('');
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Napíš odpoveď…" className="field-input min-h-[100px]" maxLength={3000} />
      {error && <div className="text-danger text-sm">{error}</div>}
      <button type="submit" disabled={loading} className="bg-accent text-white px-5 py-2.5 rounded-full text-sm font-semibold hover:bg-accent-dark disabled:opacity-50">
        {loading ? 'Odosielam…' : 'Odpovedať'}
      </button>
    </form>
  );
}
