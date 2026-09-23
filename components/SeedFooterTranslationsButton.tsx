'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SeedFooterTranslationsButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState('');

  async function run() {
    setLoading(true);
    setResult('');
    try {
      const res = await fetch('/api/admin/translations/seed-footer-batch', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Doplnenie zlyhalo.');
      setResult(`Hotovo — vytvorených ${data.created}, doplnených ${data.updated} z ${data.total} kľúčov.`);
      router.refresh();
    } catch (err: any) {
      setResult(err.message || 'Doplnenie zlyhalo.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-2 mb-4">
      <button
        type="button"
        onClick={run}
        disabled={loading}
        className="text-xs font-semibold text-accent hover:underline disabled:opacity-50"
      >
        {loading ? 'Dopĺňam…' : '✅ Doplniť pripravené EN/CS preklady (pätička, štatistický panel)'}
      </button>
      {result && <span className="text-xs text-muted">{result}</span>}
    </div>
  );
}
