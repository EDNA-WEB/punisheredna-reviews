'use client';

import { useState } from 'react';
import SubmissionModalShell from './SubmissionModalShell';
import RichTextBlocks from './RichTextBlocks';

export default function AddContentModal({ movieId, movieTitle, movieYear, onClose }: { movieId: string; movieTitle: string; movieYear: string | null; onClose: () => void }) {
  const [combined, setCombined] = useState('');

  async function handleSubmit() {
    if (!combined) return { ok: false, error: 'Napíš prosím aspoň jeden odstavec obsahu.' };
    const res = await fetch(`/api/movies/${movieId}/content-submissions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body: combined, type: 'CONTENT' })
    });
    const data = await res.json();
    if (!res.ok) return { ok: false, error: data.error };
    return { ok: true };
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-night/70 p-4 overflow-y-auto">
      <div className="bg-card rounded-xl w-full max-w-xl my-8 relative p-6">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-muted hover:bg-surface transition-colors"
          aria-label="Zavrieť"
        >
          ✕
        </button>
        <SubmissionModalShell
          title="Přidat obsah"
          explanation={`Obsah k filmu/seriálu nemusí byť dlhý (stačí 5-8 viet), ale musí zrozumiteľne popísať, o čom daný film/seriál je. Žiadne ďalšie informácie do obsahu nepatria, tie umiestnime do Zaujímavostí. Obsah nesmie film/seriál ani nijako hodnotiť, musí byť nestranný. Ďakujeme!`}
          movieTitle={movieTitle}
          movieYear={movieYear}
          submitLabel="Poslat obsah ke schválení a korektuře"
          onSubmit={handleSubmit}
        >
          <RichTextBlocks addMoreLabel="další obsah" onChange={setCombined} />
        </SubmissionModalShell>
      </div>
    </div>
  );
}
