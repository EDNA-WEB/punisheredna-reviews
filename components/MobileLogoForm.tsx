'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

// Rovnaký princíp ako tapeta appky — vlastný nahraný obrázok loga, čo sa
// zobrazí na uvítacej obrazovke namiesto jednoduchého kruhu s písmenom.
export default function MobileLogoForm({ initial }: { initial: string | null }) {
  const router = useRouter();
  const [logo, setLogo] = useState(initial || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        // Logo je malé a väčšinou jednoduché — 800px stačí na ostrý výsledok
        // aj na najväčších telefónoch, bez zbytočne veľkého súboru.
        const maxW = 800;
        const scale = Math.min(1, maxW / img.width);
        const canvas = document.createElement('canvas');
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        setLogo(canvas.toDataURL('image/webp', 0.95));
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
        body: JSON.stringify({ mobileLogo: logo || null })
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
    setLogo('');
    setLoading(true);
    try {
      await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobileLogo: null })
      });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md space-y-5">
      <label
        htmlFor="mobile-logo-upload"
        className="block border-2 border-dashed border-line rounded-xl p-6 text-center text-muted text-sm cursor-pointer min-h-[160px] flex items-center justify-center"
      >
        {logo ? (
          <img src={logo} alt="Logo appky" className="max-h-32 max-w-full object-contain" />
        ) : (
          'Klikni a vyber obrázok loga (odporúčame štvorcový, min. 400×400, s priehľadným alebo tmavým pozadím)'
        )}
      </label>
      <input id="mobile-logo-upload" type="file" accept="image/*" className="hidden" onChange={handleUpload} />

      {error && <div className="text-danger text-sm">{error}</div>}

      <div className="flex gap-3">
        <button onClick={save} disabled={loading} className="bg-accent text-white px-6 py-3 rounded-full text-sm font-semibold hover:bg-accent-dark disabled:opacity-50">
          {loading ? 'Ukladám…' : 'Uložiť logo appky'}
        </button>
        {logo && (
          <button onClick={remove} disabled={loading} className="border border-line text-muted px-6 py-3 rounded-full text-sm font-semibold hover:text-danger hover:border-danger">
            Odstrániť logo
          </button>
        )}
      </div>
    </div>
  );
}
