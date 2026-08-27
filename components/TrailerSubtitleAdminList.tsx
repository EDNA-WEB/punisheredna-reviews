'use client';

import { useState } from 'react';
import Link from 'next/link';
import VideoSubtitleManager from './VideoSubtitleManager';

type Subtitle = { id: string; startTime: number; endTime: number; text: string };
type TrailerItem = {
  id: string;
  title: string | null;
  youtubeId: string;
  previewImage: string | null;
  featuredOnHome: boolean;
  subtitles: Subtitle[];
  movie: { id: string; title: string; slug: string; poster: string | null };
};

function resizeToDataUrl(img: HTMLImageElement, maxWidth: number, quality: number): string {
  const scale = Math.min(1, maxWidth / img.width);
  const canvas = document.createElement('canvas');
  canvas.width = img.width * scale;
  canvas.height = img.height * scale;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/webp', quality);
}

export default function TrailerSubtitleAdminList({ items: initialItems }: { items: TrailerItem[] }) {
  const [items, setItems] = useState(initialItems);
  const [openFor, setOpenFor] = useState<string | null>(null);
  const [uploadingFor, setUploadingFor] = useState<string | null>(null);

  if (items.length === 0) {
    return <div className="border border-line rounded-xl p-10 text-center text-muted bg-surface">Zatiaľ žiadne trailery — pridaj ich pri jednotlivých filmoch cez "Upraviť film".</div>;
  }

  async function toggleFeatured(movieId: string, videoId: string, current: boolean) {
    setItems((prev) => prev.map((it) => (it.id === videoId ? { ...it, featuredOnHome: !current } : it)));
    try {
      const res = await fetch(`/api/movies/${movieId}/videos/${videoId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ featuredOnHome: !current })
      });
      if (!res.ok) throw new Error();
    } catch {
      setItems((prev) => prev.map((it) => (it.id === videoId ? { ...it, featuredOnHome: current } : it)));
      alert('Zmena zlyhala. Skús to prosím znova.');
    }
  }

  function handleUpload(movieId: string, videoId: string, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      alert('Súbor je príliš veľký (max. 8 MB).');
      return;
    }
    setUploadingFor(videoId);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = async () => {
        const dataUrl = resizeToDataUrl(img, 800, 0.82);
        try {
          const res = await fetch(`/api/movies/${movieId}/videos/${videoId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ previewImage: dataUrl })
          });
          if (!res.ok) throw new Error();
          setItems((prev) => prev.map((it) => (it.id === videoId ? { ...it, previewImage: dataUrl } : it)));
        } catch {
          alert('Nahratie náhľadového obrázka zlyhalo.');
        } finally {
          setUploadingFor(null);
        }
      };
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  return (
    <div className="space-y-2 max-w-2xl">
      {items.map((item) => (
        <div key={item.id} className="border border-line rounded-xl overflow-hidden bg-card">
          <div className="flex items-center gap-3 p-3.5">
            <div
              className="w-16 h-10 rounded-md bg-surface bg-cover bg-center flex-none"
              style={{
                backgroundImage: item.previewImage
                  ? `url('${item.previewImage}')`
                  : item.movie.poster
                  ? `url('${item.movie.poster}')`
                  : undefined
              }}
            />
            <div className="flex-1 min-w-0">
              <Link href={`/movie/${item.movie.slug}`} target="_blank" className="text-sm font-semibold text-ink hover:text-accent truncate block">
                {item.movie.title}
              </Link>
              {item.title && <div className="text-xs text-muted truncate">{item.title}</div>}
            </div>

            <label className="text-xs font-semibold text-accent hover:underline flex-none whitespace-nowrap cursor-pointer">
              {uploadingFor === item.id ? 'Nahrávam…' : item.previewImage ? 'Zmeniť náhľad' : 'Pridať náhľad'}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={uploadingFor === item.id}
                onChange={(e) => handleUpload(item.movie.id, item.id, e)}
              />
            </label>

            <button
              type="button"
              onClick={() => toggleFeatured(item.movie.id, item.id, item.featuredOnHome)}
              className={`text-xs font-semibold rounded-full px-3 py-1.5 flex-none whitespace-nowrap border ${
                item.featuredOnHome
                  ? 'bg-accent text-white border-accent'
                  : 'text-muted border-line hover:border-accent hover:text-accent'
              }`}
            >
              {item.featuredOnHome ? '✓ Na hlavnej stránke' : 'Zobraziť na hlavnej stránke'}
            </button>

            <button
              type="button"
              onClick={() => setOpenFor((cur) => (cur === item.id ? null : item.id))}
              className="text-xs font-semibold text-accent hover:underline flex-none whitespace-nowrap"
            >
              {openFor === item.id ? 'Skryť titulky' : `Titulky${item.subtitles.length > 0 ? ` (${item.subtitles.length})` : ''}`}
            </button>
          </div>

          {openFor === item.id && (
            <div className="p-3.5 pt-0">
              <VideoSubtitleManager
                movieId={item.movie.id}
                videoId={item.id}
                youtubeId={item.youtubeId}
                initialSubtitles={item.subtitles}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
