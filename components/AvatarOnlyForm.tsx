'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { IconUser } from './Icons';
import ImageCropper from './ImageCropper';

export default function AvatarOnlyForm({ initialAvatar }: { initialAvatar: string }) {
  const router = useRouter();
  const [avatar, setAvatar] = useState(initialAvatar);
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);

  function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError('Súbor je príliš veľký (max. 5 MB). Vyber prosím menší obrázok.');
      setFileName('');
      return;
    }
    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      setError('Podporovaný formát je len JPG alebo PNG.');
      setFileName('');
      return;
    }
    setError('');
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => setCropSrc(ev.target?.result as string);
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  async function saveAvatar(value: string | null) {
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatar: value })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Uloženie zlyhalo.');
      setAvatar(value || '');
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      {cropSrc && (
        <ImageCropper
          src={cropSrc}
          onCancel={() => {
            setCropSrc(null);
            setFileName('');
          }}
          onConfirm={(dataUrl) => {
            setCropSrc(null);
            saveAvatar(dataUrl);
          }}
        />
      )}

      <div className="border border-line rounded-xl bg-surface p-5 max-w-md">
        <div className="flex items-center gap-4 mb-4">
          {avatar ? (
            <img src={avatar} alt="Náhľad" className="w-20 h-20 rounded-full object-cover bg-card flex-none" />
          ) : (
            <div className="w-20 h-20 rounded-full bg-card flex items-center justify-center flex-none">
              <IconUser className="w-8 h-8 text-muted" />
            </div>
          )}

          <div className="min-w-0">
            <label htmlFor="avatar-upload" className="inline-block text-sm font-semibold text-accent hover:underline cursor-pointer">
              Vybrať súbor
            </label>
            <input id="avatar-upload" type="file" accept="image/jpeg,image/png" className="hidden" onChange={handleUpload} disabled={saving} />
            <div className="text-xs text-muted mt-1 truncate">
              {fileName || 'Žiadny súbor nevybraný'}
            </div>
          </div>
        </div>

        <p className="text-xs text-muted mb-4">Formát JPG alebo PNG / maximálna veľkosť 5 MB</p>

        {error && <div className="text-danger text-xs mb-3">{error}</div>}

        {avatar && (
          <button
            onClick={() => saveAvatar(null)}
            disabled={saving}
            className="text-xs font-semibold text-danger hover:underline disabled:opacity-50"
          >
            {saving ? 'Mažem…' : 'Zmazať'}
          </button>
        )}
      </div>
    </>
  );
}
