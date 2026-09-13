'use client';

import { useState } from 'react';
import SubmissionModalShell from './SubmissionModalShell';
import RichTextBlocks from './RichTextBlocks';

export default function AddTriviaModal({ movieId, movieTitle, movieYear, onClose }: { movieId: string; movieTitle: string; movieYear: string | null; onClose: () => void }) {
  const [combined, setCombined] = useState('');

  async function handleSubmit() {
    if (!combined) return { ok: false, error: 'Napíš prosím aspoň jednu zaujímavosť.' };
    const res = await fetch(`/api/movies/${movieId}/content-submissions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body: combined, type: 'TRIVIA' })
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
          title="Přidat zajímavost"
          explanation={`Věrohodnost zajímavostí k filmům/seriálům, které nám pošleš přes tento formulář, si před jejich zveřejněním ověříme, nicméně stejně tě prosíme, abys nám posílal pouze informace ověřené a ne ty "z hospody od piva". Pokud k zajímavosti připíšeš i zdroj, urychlíš proces jejího ověření a schválení. Jednotlivé zajímavosti piš spíše krátce a jednoduše formulované. Více krátkých zajímavostí se čte lépe, než méně dlouhých. Děkujeme!`}
          movieTitle={movieTitle}
          movieYear={movieYear}
          submitLabel="Poslat zajímavosti ke schválení a korektuře"
          onSubmit={handleSubmit}
        >
          <RichTextBlocks addMoreLabel="další zajímavost" onChange={setCombined} />
        </SubmissionModalShell>
      </div>
    </div>
  );
}
