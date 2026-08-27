'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { IconStar } from './Icons';
import { mdToHtml, readingTime } from '@/lib/markdown';
import { useT } from './TranslationProvider';

type MovieOption = { id: string; title: string; year: string | null };
type Initial = { id?: string; movieId?: string; body?: string; rating?: number };

export default function ReviewForm({ initial, movieLocked, redirectTo, apiBase }: { initial?: Initial; movieLocked?: boolean; redirectTo?: string; apiBase?: string }) {
  const t = useT();
  const router = useRouter();
  const isEdit = !!initial?.id;
  const draftKey = `review-draft-${initial?.id || 'new'}`;
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [movies, setMovies] = useState<MovieOption[]>([]);
  const [movieId, setMovieId] = useState(initial?.movieId || '');
  const [rating, setRating] = useState(initial?.rating || 0);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [body, setBody] = useState(initial?.body || '');
  const [error, setError] = useState('');
  const [existingReviewId, setExistingReviewId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(false);
  const [savedNote, setSavedNote] = useState('');

  useEffect(() => {
    fetch('/api/movies').then((r) => r.json()).then(setMovies).catch(() => {});
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      if (!body) return;
      try {
        localStorage.setItem(draftKey, JSON.stringify({ movieId, rating, body, savedAt: new Date().toLocaleTimeString('sk-SK') }));
        setSavedNote(`Návrh uložený v prehliadači ${new Date().toLocaleTimeString('sk-SK')}`);
      } catch {}
    }, 800);
    return () => clearTimeout(t);
  }, [movieId, rating, body, draftKey]);

  function wrapSelection(marker: string) {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = body.slice(start, end) || 'text';
    const newBody = body.slice(0, start) + marker + selected + marker + body.slice(end);
    setBody(newBody);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + marker.length, start + marker.length + selected.length);
    });
  }

  function handleStarClick(e: React.MouseEvent<HTMLDivElement>, i: number) {
    const rect = e.currentTarget.getBoundingClientRect();
    const left = e.clientX - rect.left < rect.width / 2;
    setRating(i + (left ? 0.5 : 1));
  }
  function handleStarMove(e: React.MouseEvent<HTMLDivElement>, i: number) {
    const rect = e.currentTarget.getBoundingClientRect();
    const left = e.clientX - rect.left < rect.width / 2;
    setHoverRating(i + (left ? 0.5 : 1));
  }

  const displayRating = hoverRating ?? rating;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!apiBase && !movieId) {
      setError('Vyber prosím film, ku ktorému recenzia patrí.');
      return;
    }
    if (!body.trim()) {
      setError('Text recenzie nemôže byť prázdny.');
      return;
    }
    setLoading(true);
    setError('');
    setExistingReviewId(null);
    try {
      const payload = apiBase ? { body, rating } : { movieId, body, rating };
      const url = isEdit ? `/api/reviews/${initial!.id}` : apiBase ? `${apiBase}/reviews` : '/api/reviews';
      const res = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 409 && data.existingId) setExistingReviewId(data.existingId);
        throw new Error(data.error || 'Uloženie zlyhalo.');
      }
      try { localStorage.removeItem(draftKey); } catch {}
      router.push(redirectTo || '/admin');
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const wordCount = body.trim().split(/\s+/).filter(Boolean).length;

  return (
    <form onSubmit={submit} className="max-w-2xl space-y-6">
      <div>
        <label className="block text-sm font-semibold text-ink mb-2">Film</label>
        {movieLocked ? (
          <div className="field-input bg-surface text-muted">
            {movies.find((m) => m.id === movieId)?.title || 'Vybraný film'}
          </div>
        ) : (
          <select className="field-input" value={movieId} onChange={(e) => setMovieId(e.target.value)}>
            <option value="">— Vyber film —</option>
            {movies.map((m) => (
              <option key={m.id} value={m.id}>{m.title}{m.year ? ` (${m.year})` : ''}</option>
            ))}
          </select>
        )}
        <p className="text-xs text-muted mt-1.5">
          Film tu nevidíš? Najprv ho pridaj v sekcii <a href="/admin/movies/new" className="text-accent hover:underline">Filmy</a>.
        </p>
      </div>

      <div>
        <label className="block text-sm font-semibold text-ink mb-2">{t('movie.moje_hodnotenie')}</label>
        <div className="flex" onMouseLeave={() => setHoverRating(null)}>
          {[0, 1, 2, 3, 4].map((i) => {
            const filled = displayRating >= i + 1;
            const half = !filled && displayRating >= i + 0.5;
            return (
              <div key={i} className="relative w-8 h-8 cursor-pointer" onClick={(e) => handleStarClick(e, i)} onMouseMove={(e) => handleStarMove(e, i)}>
                <IconStar className="absolute inset-0 w-8 h-8 text-line" filled={false} />
                {(filled || half) && (
                  <span className={`absolute inset-0 overflow-hidden ${half ? 'w-1/2' : 'w-full'}`}>
                    <IconStar className="w-8 h-8 text-accent" filled />
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
          <label className="block text-sm font-semibold text-ink">Text recenzie</label>
          <div className="flex items-center gap-1.5">
            <button type="button" onClick={() => wrapSelection('**')} className="w-8 h-8 rounded-lg border border-line text-sm font-bold hover:border-night">B</button>
            <button type="button" onClick={() => wrapSelection('*')} className="w-8 h-8 rounded-lg border border-line text-sm italic hover:border-night">I</button>
            <button type="button" onClick={() => setPreview((p) => !p)} className={`h-8 px-3 rounded-lg border text-xs font-semibold ${preview ? 'bg-night text-white border-night' : 'border-line hover:border-night'}`}>
              {preview ? 'Upraviť' : 'Náhľad'}
            </button>
          </div>
        </div>

        {preview ? (
          <div className="field-input min-h-[260px] leading-relaxed article-body overflow-auto" dangerouslySetInnerHTML={{ __html: mdToHtml(body) || '<p class="text-muted">Zatiaľ nič nenapísané…</p>' }} />
        ) : (
          <textarea ref={textareaRef} className="field-input min-h-[260px] leading-relaxed" value={body} onChange={(e) => setBody(e.target.value)} placeholder="Napíš svoju recenziu…" />
        )}

        <div className="flex items-center justify-between mt-2 text-xs text-muted">
          <span>{wordCount} slov · odhad {readingTime(body)} min čítania</span>
          {savedNote && <span>{savedNote}</span>}
        </div>
      </div>

      {error && (
        <div className="text-danger text-sm">
          {error}
          {existingReviewId && (
            <> Nájdeš a upravíš ju priamo pod ceruzkou vedľa nej na profile.</>
          )}
        </div>
      )}

      <div className="flex gap-3">
        <button type="submit" disabled={loading} className="bg-accent text-white px-6 py-3 rounded-full text-sm font-semibold hover:bg-accent-dark disabled:opacity-50">
          {loading ? 'Ukladám…' : isEdit ? 'Uložiť zmeny' : 'Publikovať recenziu'}
        </button>
        <button type="button" onClick={() => router.back()} className="border border-line text-muted px-6 py-3 rounded-full text-sm font-semibold hover:text-ink hover:border-night">
          Zrušiť
        </button>
      </div>
    </form>
  );
}
