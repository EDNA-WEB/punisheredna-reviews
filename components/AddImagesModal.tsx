'use client';

import { useState } from 'react';
import SubmissionModalShell from './SubmissionModalShell';

function resizeToDataUrl(img: HTMLImageElement, maxWidth: number, quality: number): string {
  const scale = Math.min(1, maxWidth / img.width);
  const canvas = document.createElement('canvas');
  canvas.width = img.width * scale;
  canvas.height = img.height * scale;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/webp', 0.85);
}

export default function AddImagesModal({ movieId, movieTitle, movieYear, onClose }: { movieId: string; movieTitle: string; movieYear: string | null; onClose: () => void }) {
  const [images, setImages] = useState<string[]>([]);

  function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = document.createElement('img');
        img.onload = () => setImages((prev) => [...prev, resizeToDataUrl(img, 1200, 0.85)]);
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    });
  }

  async function handleSubmit() {
    if (images.length === 0) return { ok: false, error: 'Nahraj prosím aspoň jeden obrázok.' };
    const res = await fetch(`/api/movies/${movieId}/content-submissions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body: JSON.stringify(images), type: 'IMAGES' })
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
          title="Přidat obrázky"
          explanation="Nahraj fotky z filmu/seriálu (plagáty, zábery zo scén a pod.). Pred zverejnením v galérii ich skontrolujeme."
          movieTitle={movieTitle}
          movieYear={movieYear}
          submitLabel="Poslat obrázky ke schválení"
          onSubmit={handleSubmit}
        >
          <label className="border border-dashed border-line rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:border-accent transition-colors">
            <span className="text-sm text-muted mb-1">Klikni a vyber obrázky</span>
            <span className="text-xs text-muted">Môžeš vybrať viac naraz</span>
            <input type="file" accept="image/*" multiple className="hidden" onChange={handleFiles} />
          </label>
          {images.length > 0 && (
            <div className="grid grid-cols-4 gap-2 mt-3">
              {images.map((src, i) => (
                <div key={i} className="relative aspect-square rounded-lg overflow-hidden border border-line">
                  <img src={src} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setImages((prev) => prev.filter((_, idx) => idx !== i))}
                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-night/70 text-white text-xs flex items-center justify-center"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </SubmissionModalShell>
      </div>
    </div>
  );
}
