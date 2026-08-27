'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Initial = {
  appStoreUrl: string | null;
  googlePlayUrl: string | null;
  facebookUrl: string | null;
  instagramUrl: string | null;
  tiktokUrl: string | null;
  youtubeUrl: string | null;
};

export default function AppAndSocialLinksForm({ initial }: { initial: Initial }) {
  const router = useRouter();
  const [appStoreUrl, setAppStoreUrl] = useState(initial.appStoreUrl || '');
  const [googlePlayUrl, setGooglePlayUrl] = useState(initial.googlePlayUrl || '');
  const [facebookUrl, setFacebookUrl] = useState(initial.facebookUrl || '');
  const [instagramUrl, setInstagramUrl] = useState(initial.instagramUrl || '');
  const [tiktokUrl, setTiktokUrl] = useState(initial.tiktokUrl || '');
  const [youtubeUrl, setYoutubeUrl] = useState(initial.youtubeUrl || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  async function save() {
    setLoading(true);
    setError('');
    setSaved(false);
    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appStoreUrl: appStoreUrl || null,
          googlePlayUrl: googlePlayUrl || null,
          facebookUrl: facebookUrl || null,
          instagramUrl: instagramUrl || null,
          tiktokUrl: tiktokUrl || null,
          youtubeUrl: youtubeUrl || null
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Uloženie zlyhalo.');
      setSaved(true);
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-xl space-y-5">
      <div>
        <div className="text-xs font-bold uppercase tracking-wide text-muted mb-2.5">Mobilná aplikácia</div>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-semibold text-ink mb-1.5">Odkaz na App Store</label>
            <input className="field-input" value={appStoreUrl} onChange={(e) => setAppStoreUrl(e.target.value)} placeholder="https://apps.apple.com/..." />
          </div>
          <div>
            <label className="block text-sm font-semibold text-ink mb-1.5">Odkaz na Google Play</label>
            <input className="field-input" value={googlePlayUrl} onChange={(e) => setGooglePlayUrl(e.target.value)} placeholder="https://play.google.com/..." />
          </div>
        </div>
      </div>

      <div>
        <div className="text-xs font-bold uppercase tracking-wide text-muted mb-2.5">Sociálne siete</div>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-semibold text-ink mb-1.5">Facebook</label>
            <input className="field-input" value={facebookUrl} onChange={(e) => setFacebookUrl(e.target.value)} placeholder="https://facebook.com/..." />
          </div>
          <div>
            <label className="block text-sm font-semibold text-ink mb-1.5">Instagram</label>
            <input className="field-input" value={instagramUrl} onChange={(e) => setInstagramUrl(e.target.value)} placeholder="https://instagram.com/..." />
          </div>
          <div>
            <label className="block text-sm font-semibold text-ink mb-1.5">TikTok</label>
            <input className="field-input" value={tiktokUrl} onChange={(e) => setTiktokUrl(e.target.value)} placeholder="https://tiktok.com/..." />
          </div>
          <div>
            <label className="block text-sm font-semibold text-ink mb-1.5">YouTube</label>
            <input className="field-input" value={youtubeUrl} onChange={(e) => setYoutubeUrl(e.target.value)} placeholder="https://youtube.com/..." />
          </div>
        </div>
      </div>

      {error && <div className="text-danger text-sm">{error}</div>}
      {saved && !error && <div className="text-emerald-600 text-sm font-semibold">Odkazy boli uložené.</div>}

      <button onClick={save} disabled={loading} className="bg-accent text-white px-6 py-3 rounded-full text-sm font-semibold hover:bg-accent-dark disabled:opacity-50">
        {loading ? 'Ukladám…' : 'Uložiť odkazy'}
      </button>
      <p className="text-xs text-muted">Prázdne pole = daná ikonka/tlačidlo sa na hlavnej stránke jednoducho nezobrazí.</p>
    </div>
  );
}
