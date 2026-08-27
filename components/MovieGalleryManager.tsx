'use client';

import { useState } from 'react';

type Photo = { id: string; thumbnail: string };

function resizeToDataUrl(img: HTMLImageElement, maxWidth: number, quality: number): string {
  const scale = Math.min(1, maxWidth / img.width);
  const canvas = document.createElement('canvas');
  canvas.width = img.width * scale;
  canvas.height = img.height * scale;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/webp', quality);
}

export default function MovieGalleryManager({ movieId, initialPhotos }: { movieId: string; initialPhotos: Photo[] }) {
  const [photos, setPhotos] = useState<Photo[]>(initialPhotos);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setError('');
    setUploading(true);

    let remaining = files.length;
    const done = () => {
      remaining--;
      if (remaining === 0) setUploading(false);
    };

    files.forEach((file) => {
      if (file.size > 12 * 1024 * 1024) {
        setError('Niektorý súbor je príliš veľký (max. 12 MB na fotku) a bol preskočený.');
        done();
        return;
      }
      const reader = new FileReader();
      reader.onload = (ev) => {
        const img = new Image();
        img.onload = async () => {
          try {
            // Malý, úsporný náhľad (do galérie) + väčšia, kvalitnejšia verzia (na priblíženie).
            const thumbnail = resizeToDataUrl(img, 320, 0.7);
            const full = resizeToDataUrl(img, 1280, 0.78);

            const res = await fetch(`/api/movies/${movieId}/photos`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ thumbnail, full })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Nahratie zlyhalo.');
            setPhotos((prev) => [...prev, { id: data.id, thumbnail: data.thumbnail }]);
          } catch (err: any) {
            setError(err.message);
          } finally {
            done();
          }
        };
        img.src = ev.target?.result as string;
      };
      reader.readAsDataURL(file);
    });

    e.target.value = '';
  }

  async function removePhoto(id: string) {
    setPhotos((prev) => prev.filter((p) => p.id !== id));
    await fetch(`/api/movies/${movieId}/photos/${id}`, { method: 'DELETE' }).catch(() => {});
  }

  return (
    <div className="border border-line rounded-xl p-4 bg-surface space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-xs font-bold uppercase tracking-wide text-muted">Fotogaléria ({photos.length}/30)</div>
        <label className="text-xs font-semibold text-accent hover:underline cursor-pointer">
          {uploading ? 'Nahrávam…' : '+ Pridať fotky'}
          <input type="file" accept="image/*" multiple className="hidden" onChange={handleFiles} disabled={uploading} />
        </label>
      </div>

      {error && <div className="text-danger text-xs">{error}</div>}

      {photos.length > 0 ? (
        <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
          {photos.map((p, i) => (
            <div key={p.id} className="relative group aspect-square rounded-lg overflow-hidden bg-line">
              <img src={p.thumbnail} alt="" className="w-full h-full object-cover" />
              <span className="absolute top-1 left-1 bg-night/70 text-white text-[10px] font-semibold w-4 h-4 rounded-full flex items-center justify-center leading-none">
                {i + 1}
              </span>
              <button
                type="button"
                onClick={() => removePhoto(p.id)}
                className="absolute inset-0 bg-night/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-semibold"
              >
                Zmazať #{i + 1}
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted">Zatiaľ žiadne fotky. Fotky sa ukladajú a mažú okamžite, nezávisle od uloženia formulára.</p>
      )}
    </div>
  );
}
