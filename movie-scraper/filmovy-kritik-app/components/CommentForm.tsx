'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type Target = { reviewId?: string; newsId?: string; movieId?: string };

export default function CommentForm({
  target,
  parentId,
  autoFocus,
  onDone,
  compact
}: {
  target: Target;
  parentId?: string;
  autoFocus?: boolean;
  onDone?: () => void;
  compact?: boolean;
}) {
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
        {' '}a napíš komentár.
      </div>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...target, parentId, body: text })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Komentár sa nepodarilo pridať.');
      setText('');
      onDone?.();
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <textarea
        autoFocus={autoFocus}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={parentId ? 'Napíš odpoveď…' : 'Napíš svoj názor…'}
        className={`field-input ${compact ? 'min-h-[70px] text-sm' : 'min-h-[100px]'}`}
        maxLength={2000}
      />
      {error && <div className="text-danger text-sm">{error}</div>}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={loading}
          className="bg-accent text-white px-5 py-2.5 rounded-full text-sm font-semibold hover:bg-accent-dark disabled:opacity-50"
        >
          {loading ? 'Odosielam…' : parentId ? 'Odpovedať' : 'Pridať komentár'}
        </button>
        {onDone && (
          <button type="button" onClick={onDone} className="text-sm text-muted hover:text-ink">
            Zrušiť
          </button>
        )}
      </div>
    </form>
  );
}
