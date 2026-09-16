'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function BoxOfficeRecalculateButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState('');

  async function recalculate() {
    setLoading(true);
    setResult('');
    try {
      const res = await fetch('/api/admin/box-office/recalculate-rank', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Prepočet zlyhal.');
      setResult(`Hotovo — ${data.ranked} filmov dostalo označenie z ${data.total} celkovo posúdených.`);
      router.refresh();
    } catch (err: any) {
      setResult(err.message || 'Prepočet zlyhal.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={recalculate}
        disabled={loading}
        className="text-xs font-semibold text-accent hover:underline disabled:opacity-50 whitespace-nowrap"
      >
        {loading ? 'Prepočítavam…' : '🔄 Prepočítať poradie (admin)'}
      </button>
      {result && <span className="text-xs text-muted">{result}</span>}
    </div>
  );
}
