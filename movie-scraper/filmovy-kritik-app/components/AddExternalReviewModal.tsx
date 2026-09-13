'use client';

import { useState } from 'react';
import SubmissionModalShell from './SubmissionModalShell';

export default function AddExternalReviewModal({ movieId, movieTitle, movieYear, onClose }: { movieId: string; movieTitle: string; movieYear: string | null; onClose: () => void }) {
  const [site, setSite] = useState('');
  const [url, setUrl] = useState('');

  async function handleSubmit() {
    if (!url.trim() || !/^https?:\/\//i.test(url.trim())) {
      return { ok: false, error: 'Zadaj platný odkaz (musí začínať na http:// alebo https://).' };
    }
    const body = site.trim() ? `${site.trim()}: ${url.trim()}` : url.trim();
    const res = await fetch(`/api/movies/${movieId}/content-submissions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body, type: 'EXTERNAL_REVIEW' })
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
          title="Přidat externí recenzi"
          explanation="Máš odkaz na recenziu tohto filmu/seriálu na inom webe? Podeľ sa oň — po overení ju pridáme medzi externé recenzie."
          movieTitle={movieTitle}
          movieYear={movieYear}
          submitLabel="Poslat recenzi ke schválení"
          onSubmit={handleSubmit}
        >
          <div className="space-y-3">
            <input
              className="field-input"
              value={site}
              onChange={(e) => setSite(e.target.value)}
              placeholder="Názov webu/autora (napr. ČSFD, Filmtoro…)"
            />
            <input
              className="field-input"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://…"
            />
          </div>
        </SubmissionModalShell>
      </div>
    </div>
  );
}
