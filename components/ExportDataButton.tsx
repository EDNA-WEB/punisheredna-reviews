'use client';

import { useState } from 'react';

export default function ExportDataButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function download() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/profile/export-data');
      if (!res.ok) throw new Error('Sťahovanie zlyhalo. Skús to prosím znova.');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'moje-udaje.json';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err.message || 'Sťahovanie zlyhalo.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="border border-line rounded-xl p-5">
      <h2 className="font-display font-bold text-lg text-ink mb-1">Stiahnuť moje údaje</h2>
      <p className="text-sm text-muted mb-4">
        Stiahni si kópiu svojich osobných údajov a obsahu, čo si na webe vytvoril (recenzie, hodnotenia, komentáre,
        watchlist, poznámky a ďalšie) — v čitateľnom JSON formáte.
      </p>
      {error && <p className="text-danger text-sm mb-3">{error}</p>}
      <button
        type="button"
        onClick={download}
        disabled={loading}
        className="text-sm font-semibold text-accent border border-accent rounded-full px-4 py-2 hover:bg-accent hover:text-white transition-colors disabled:opacity-50"
      >
        {loading ? 'Pripravujem…' : 'Stiahnuť moje údaje'}
      </button>
    </div>
  );
}
