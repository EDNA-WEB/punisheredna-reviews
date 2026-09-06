'use client';

import { useState } from 'react';

// hasAudio = true, kým hlasovka ešte existuje na serveri (v rámci 1-minútového
// okna od prvého otvorenia sa dá prehrať aj opakovane). Až keď server hlasovku
// natrvalo odstráni (po uplynutí okna), táto hodnota bude false.
export default function MessageAudioPlayer({ messageId, mine, hasAudio }: { messageId: string; mine: boolean; hasAudio: boolean }) {
  const [revealedUrl, setRevealedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [gone, setGone] = useState(!hasAudio);
  const [error, setError] = useState('');

  async function reveal() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/messages/${messageId}/play-audio`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setRevealedUrl(data.audio);
    } catch (err: any) {
      setError(err.message || 'Hlasovku sa nepodarilo prehrať.');
      setGone(true);
    } finally {
      setLoading(false);
    }
  }

  if (revealedUrl) {
    return (
      <div className="mb-1.5">
        <audio src={revealedUrl} controls autoPlay className="max-w-full" style={{ height: '36px' }} />
        <p className={`text-[10px] mt-1 ${mine ? 'text-white/60' : 'text-muted'}`}>Dostupné ešte asi minútu od prvého otvorenia.</p>
      </div>
    );
  }

  if (gone) {
    return (
      <div className={`flex items-center gap-2 rounded-xl px-3 py-2.5 mb-1.5 ${mine ? 'bg-black/15' : 'bg-line/50'}`}>
        <span className="text-base">🎤</span>
        <span className={`text-xs italic ${mine ? 'text-white/70' : 'text-muted'}`}>Hlasová správa bola prehraná</span>
      </div>
    );
  }

  if (mine) {
    return (
      <div className="flex items-center gap-2 rounded-xl px-3 py-2.5 mb-1.5 bg-black/15">
        <span className="text-base">🎤</span>
        <span className="text-xs text-white/85">Hlasová správa odoslaná — po otvorení bude dostupná ešte minútu</span>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={reveal}
      disabled={loading}
      className="flex items-center gap-2 rounded-xl px-3 py-2.5 mb-1.5 bg-line/50 hover:bg-line transition-colors disabled:opacity-60"
    >
      <span className="text-base">▶️</span>
      <span className="text-xs font-semibold text-ink">{loading ? 'Načítavam…' : 'Klikni na prehratie (dostupné ešte minútu)'}</span>
      {error && <span className="text-[10px] text-danger">{error}</span>}
    </button>
  );
}
