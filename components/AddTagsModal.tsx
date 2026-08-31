'use client';

import { useState } from 'react';
import SubmissionModalShell from './SubmissionModalShell';

export default function AddTagsModal({ movieId, movieTitle, movieYear, onClose }: { movieId: string; movieTitle: string; movieYear: string | null; onClose: () => void }) {
  const [value, setValue] = useState('');

  async function handleSubmit() {
    if (!value.trim()) return { ok: false, error: 'Napíš prosím aspoň jeden tag.' };
    const res = await fetch(`/api/movies/${movieId}/content-submissions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body: value.trim(), type: 'TAGS' })
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
          title="Přidat tagy"
          explanation="Navrhni tagy, ktoré k filmu/seriálu sedia — oddeľ ich čiarkou (napr. Marvel, superhrdinovia, vesmír). Pomáhajú ostatným film ľahšie nájsť."
          movieTitle={movieTitle}
          movieYear={movieYear}
          submitLabel="Poslat tagy ke schválení"
          onSubmit={handleSubmit}
        >
          <input
            className="field-input"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="napr. Marvel, superhrdinovia, vesmír"
          />
        </SubmissionModalShell>
      </div>
    </div>
  );
}
