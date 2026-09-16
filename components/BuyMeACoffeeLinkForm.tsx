'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function BuyMeACoffeeLinkForm({ initial }: { initial: string | null }) {
  const router = useRouter();
  const [url, setUrl] = useState(initial || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  async function save() {
    setLoading(true);
    setError('');
    setSaved(false);
    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ buyMeACoffeeUrl: url || null })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Uloženie zlyhalo.');
      setSaved(true);
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="border border-line rounded-xl p-4 space-y-3">
      <h2 className="text-sm font-bold text-ink">Odkaz na BuyMeACoffee</h2>
      <p className="text-xs text-muted">Zobrazí sa ako tlačidlo "Kúpiť členstvo" na webe. Prázdne pole = tlačidlo sa nezobrazí.</p>
      <input
        className="field-input-sm w-full"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="https://www.buymeacoffee.com/..."
      />
      {error && <p className="text-danger text-xs">{error}</p>}
      {saved && !error && <p className="text-emerald-600 text-xs font-semibold">Uložené.</p>}
      <button
        type="button"
        onClick={save}
        disabled={loading}
        className="bg-accent text-white text-xs font-semibold px-4 py-2 rounded-full hover:bg-accent-dark disabled:opacity-50"
      >
        {loading ? 'Ukladám…' : 'Uložiť odkaz'}
      </button>
    </div>
  );
}
