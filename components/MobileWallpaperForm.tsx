'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

// Rovnaký princíp ako WallpaperForm (tapeta webu), ale ukladá do
// SAMOSTATNÉHO poľa "mobileWallpaper" — appka a web tak môžu mať úplne
// odlišné pozadia, nezávisle od seba.
export default function MobileWallpaperForm({ initial }: { initial: string | null }) {
  const router = useRouter();
  const [wallpaper, setWallpaper] = useState(initial || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        // Vyššia šírka a kvalita ako pri tapete webu — táto tapeta sa
        // zobrazuje cez celú výšku telefónu zblízka, takže je citlivejšia
        // na akékoľvek stratové stláčanie.
        const maxW = 2400;
        const scale = Math.min(1, maxW / img.width);
        const canvas = document.createElement('canvas');
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        setWallpaper(canvas.toDataURL('image/webp', 0.95));
      };
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(file);
  }

  async function save() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobileWallpaper: wallpaper || null })
      });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      setError('Uloženie zlyhalo. Skús to prosím znova.');
    } finally {
      setLoading(false);
    }
  }

  async function remove() {
    setWallpaper('');
    setLoading(true);
    try {
      await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobileWallpaper: null })
      });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-5">
      <label
        htmlFor="mobile-wallpaper-upload"
        className="block border-2 border-dashed border-line rounded-xl p-6 text-center text-muted text-sm cursor-pointer bg-cover bg-center min-h-[180px] flex items-center justify-center"
        style={
          wallpaper
            ? { backgroundImage: `url('${wallpaper}')`, color: '#fff', textShadow: '0 1px 4px rgba(0,0,0,0.8)', backgroundColor: 'rgba(0,0,0,0.25)', backgroundBlendMode: 'darken' }
            : undefined
        }
      >
        {wallpaper ? 'Klikni pre zmenu tapety appky' : 'Klikni a vyber obrázok tapety pre uvítaciu obrazovku appky (odporúčame na výšku, min. 1080×1920)'}
      </label>
      <input id="mobile-wallpaper-upload" type="file" accept="image/*" className="hidden" onChange={handleUpload} />

      {error && <div className="text-danger text-sm">{error}</div>}

      <div className="flex gap-3">
        <button onClick={save} disabled={loading} className="bg-accent text-white px-6 py-3 rounded-full text-sm font-semibold hover:bg-accent-dark disabled:opacity-50">
          {loading ? 'Ukladám…' : 'Uložiť tapetu appky'}
        </button>
        {wallpaper && (
          <button onClick={remove} disabled={loading} className="border border-line text-muted px-6 py-3 rounded-full text-sm font-semibold hover:text-danger hover:border-danger">
            Odstrániť tapetu appky
          </button>
        )}
      </div>
    </div>
  );
}
