'use client';

import { useState } from 'react';

type Video = { id: string; url: string; category: string; title: string | null };

const CATEGORY_LABELS: Record<string, string> = {
  trailer: 'Trailer',
  tv_spot: 'TV spot',
  ukazka: 'Ukážka z filmu'
};

export default function MovieVideoManager({ movieId, initialVideos }: { movieId: string; initialVideos: Video[] }) {
  const [videos, setVideos] = useState<Video[]>(initialVideos);
  const [url, setUrl] = useState('');
  const [category, setCategory] = useState('trailer');
  const [title, setTitle] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function addVideo() {
    if (!url.trim()) return;
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`/api/movies/${movieId}/videos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim(), category, title: title.trim() || null })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Pridanie zlyhalo.');
      setVideos((prev) => [...prev, data]);
      setUrl('');
      setTitle('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function removeVideo(id: string) {
    setVideos((prev) => prev.filter((v) => v.id !== id));
    await fetch(`/api/movies/${movieId}/videos/${id}`, { method: 'DELETE' }).catch(() => {});
  }

  return (
    <div className="border border-line rounded-xl p-4 bg-surface space-y-3">
      <div className="text-xs font-bold uppercase tracking-wide text-muted">Videá ({videos.length}/30)</div>

      {videos.length > 0 && (
        <ul className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
          {videos.map((v) => (
            <li key={v.id} className="flex items-center gap-2 text-xs text-ink border-b border-line pb-1.5 last:border-b-0">
              <span className="bg-card border border-line rounded-full px-2 py-0.5 text-[10px] font-semibold text-muted flex-none">
                {CATEGORY_LABELS[v.category] || v.category}
              </span>
              <span className="flex-1 truncate">{v.title || v.url}</span>
              <button type="button" onClick={() => removeVideo(v.id)} className="text-muted hover:text-danger flex-none">
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="grid grid-cols-2 gap-2">
        <select className="field-input-sm" value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="trailer">Trailer</option>
          <option value="tv_spot">TV spot</option>
          <option value="ukazka">Ukážka z filmu</option>
        </select>
        <input className="field-input-sm" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Názov (voliteľné)" />
      </div>
      <div className="flex items-center gap-2">
        <input
          className="field-input-sm flex-1"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://www.youtube.com/watch?v=…"
        />
        <button
          type="button"
          onClick={addVideo}
          disabled={saving || !url.trim()}
          className="bg-accent text-white text-xs font-semibold px-3 py-1.5 rounded-full hover:bg-accent-dark disabled:opacity-50 flex-none"
        >
          {saving ? '…' : 'Pridať'}
        </button>
      </div>

      {error && <div className="text-danger text-xs">{error}</div>}
      <p className="text-xs text-muted">Ukladá sa okamžite, nezávisle od uloženia formulára nižšie.</p>
    </div>
  );
}
