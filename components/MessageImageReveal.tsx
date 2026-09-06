'use client';

import { useState } from 'react';
import { IconImage } from './Icons';

export default function MessageImageReveal({ messageId, mine, alreadyViewed }: { messageId: string; mine: boolean; alreadyViewed: boolean }) {
  const [revealedUrl, setRevealedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [viewed, setViewed] = useState(alreadyViewed);

  async function reveal() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/messages/${messageId}/view-image`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setRevealedUrl(data.image);
    } catch (err: any) {
      setError(err.message || 'Fotku sa nepodarilo zobraziť.');
      setViewed(true);
    } finally {
      setLoading(false);
    }
  }

  if (revealedUrl) {
    return (
      <div className="mb-1.5">
        <img src={revealedUrl} alt="Príloha" className="rounded-xl max-h-64" />
        <p className={`text-[10px] mt-1 ${mine ? 'text-white/70' : 'text-muted'}`}>Táto fotka sa už znova nezobrazí.</p>
      </div>
    );
  }

  if (viewed) {
    return (
      <div className={`flex items-center gap-2 rounded-xl px-3 py-2.5 mb-1.5 ${mine ? 'bg-white/15' : 'bg-line/60'}`}>
        <IconImage className="w-4 h-4 flex-none opacity-70" />
        <span className="text-xs italic opacity-80">Fotka bola zobrazená</span>
      </div>
    );
  }

  if (mine) {
    return (
      <div className="flex items-center gap-2 rounded-xl px-3 py-2.5 mb-1.5 bg-white/15">
        <IconImage className="w-4 h-4 flex-none" />
        <span className="text-xs">Fotka odoslaná — zobrazí sa len raz</span>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={reveal}
      disabled={loading}
      className="flex items-center gap-2 rounded-xl px-3 py-2.5 mb-1.5 bg-line/60 hover:bg-line transition-colors disabled:opacity-60"
    >
      <IconImage className="w-4 h-4 flex-none text-ink" />
      <span className="text-xs font-semibold text-ink">{loading ? 'Otváram…' : 'Klikni pre zobrazenie fotky (zobrazí sa len raz)'}</span>
      {error && <span className="text-[10px] text-danger">{error}</span>}
    </button>
  );
}
