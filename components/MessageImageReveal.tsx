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
        <p className="text-[10px] mt-1 text-white/60">Táto fotka sa už znova nezobrazí.</p>
      </div>
    );
  }

  if (viewed) {
    return (
      <div className="flex items-center gap-2 rounded-xl px-3 py-2.5 mb-1.5 bg-black/20">
        <IconImage className="w-4 h-4 flex-none text-white/70" />
        <span className="text-xs italic text-white/70">Fotka bola zobrazená</span>
      </div>
    );
  }

  if (mine) {
    return (
      <div className="flex items-center gap-2 rounded-xl px-3 py-2.5 mb-1.5 bg-black/20">
        <IconImage className="w-4 h-4 flex-none text-white/85" />
        <span className="text-xs text-white/85">Fotka odoslaná — zobrazí sa len raz</span>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={reveal}
      disabled={loading}
      className="flex items-center gap-2 rounded-xl px-3 py-2.5 mb-1.5 bg-black/20 hover:bg-black/30 transition-colors disabled:opacity-60"
    >
      <IconImage className="w-4 h-4 flex-none text-white/85" />
      <span className="text-xs font-semibold text-white/85">{loading ? 'Otváram…' : 'Klikni pre zobrazenie fotky (zobrazí sa len raz)'}</span>
      {error && <span className="text-[10px] text-[#f15c6d]">{error}</span>}
    </button>
  );
}
