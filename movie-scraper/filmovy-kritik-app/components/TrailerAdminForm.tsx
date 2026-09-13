'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function TrailerAdminForm() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [poster, setPoster] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const maxW = 500;
        const scale = Math.min(1, maxW / img.width);
        const canvas = document.createElement('canvas');
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        setPoster(canvas.toDataURL('image/webp', 0.8));
      };
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(file);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !youtubeUrl.trim()) {
      setError('Vyplň názov aj YouTube odkaz.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/trailers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, youtubeUrl, posterImage: poster })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Uloženie zlyhalo.');
      setTitle('');
      setYoutubeUrl('');
      setPoster('');
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="max-w-lg space-y-4 border border-line rounded-xl p-5 bg-surface">
      <div>
        <label className="block text-sm font-semibold text-ink mb-2">Náhľadová fotka (nepovinné)</label>
        <label
          htmlFor="trailer-poster"
          className="block border-2 border-dashed border-line rounded-xl p-4 text-center text-muted text-xs cursor-pointer bg-cover bg-center min-h-[80px] flex items-center justify-center bg-card"
          style={poster ? { backgroundImage: `url('${poster}')` } : undefined}
        >
          {poster ? '' : 'Klikni a vyber fotku'}
        </label>
        <input id="trailer-poster" type="file" accept="image/*" className="hidden" onChange={handleUpload} />
      </div>
      <div>
        <label className="block text-sm font-semibold text-ink mb-2">Názov filmu / seriálu</label>
        <input className="field-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="napr. Odyssea" />
      </div>
      <div>
        <label className="block text-sm font-semibold text-ink mb-2">YouTube odkaz na trailer</label>
        <input className="field-input" value={youtubeUrl} onChange={(e) => setYoutubeUrl(e.target.value)} placeholder="https://www.youtube.com/watch?v=..." />
      </div>
      {error && <div className="text-danger text-sm">{error}</div>}
      <button
        type="submit"
        disabled={loading}
        className="bg-accent text-white px-5 py-2.5 rounded-full text-sm font-semibold hover:bg-accent-dark disabled:opacity-50"
      >
        {loading ? 'Pridávam…' : '+ Pridať trailer'}
      </button>
    </form>
  );
}
