'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ReportReviewButton({ reportId, initialReviewed }: { reportId: string; initialReviewed: boolean }) {
  const router = useRouter();
  const [reviewed, setReviewed] = useState(initialReviewed);
  const [loading, setLoading] = useState(false);

  async function toggle() {
    setLoading(true);
    try {
      const res = await fetch(`/api/message-reports/${reportId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewed: !reviewed })
      });
      if (!res.ok) throw new Error();
      setReviewed((v) => !v);
      router.refresh();
    } catch {
      alert('Akcia zlyhala.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={loading}
      className={`text-xs font-semibold px-3 py-1.5 rounded-full flex-none disabled:opacity-50 ${
        reviewed ? 'border border-line text-muted hover:text-ink' : 'bg-accent text-white hover:bg-accent-dark'
      }`}
    >
      {loading ? '…' : reviewed ? 'Vybavené ✓' : 'Označiť ako vybavené'}
    </button>
  );
}
