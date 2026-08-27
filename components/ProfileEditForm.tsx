'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { IconUser } from './Icons';
import ImageCropper from './ImageCropper';

export default function ProfileEditForm({
  userId,
  initialName,
  initialAvatar,
  initialBio
}: {
  userId: string;
  initialName: string;
  initialAvatar: string;
  initialBio: string;
}) {
  const router = useRouter();
  const { update } = useSession();
  const [name, setName] = useState(initialName);
  const [avatar, setAvatar] = useState(initialAvatar);
  const [bio, setBio] = useState(initialBio);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);

  function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      setError('Súbor je príliš veľký (max. 8 MB). Vyber prosím menší obrázok.');
      return;
    }
    setError('');
    const reader = new FileReader();
    reader.onload = (ev) => setCropSrc(ev.target?.result as string);
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError('Meno nemôže byť prázdne.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, avatar, bio })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Uloženie zlyhalo.');
      await update({ name });
      router.push(`/profile/${userId}`);
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {cropSrc && (
        <ImageCropper
          src={cropSrc}
          onCancel={() => setCropSrc(null)}
          onConfirm={(dataUrl) => {
            setAvatar(dataUrl);
            setCropSrc(null);
          }}
        />
      )}

      <form onSubmit={submit} className="max-w-md space-y-6">
      <div>
        <label className="block text-sm font-semibold text-ink mb-2">Fotka profilu</label>
        <div className="flex items-center gap-4">
          {avatar ? (
            <img src={avatar} alt="Náhľad" className="w-20 h-20 rounded-full object-cover bg-surface" />
          ) : (
            <div className="w-20 h-20 rounded-full bg-surface flex items-center justify-center">
              <IconUser className="w-8 h-8 text-muted" />
            </div>
          )}
          <label htmlFor="avatar-upload" className="text-sm font-semibold text-accent hover:underline cursor-pointer">
            {avatar ? 'Zmeniť fotku' : 'Nahrať fotku'}
          </label>
          <input id="avatar-upload" type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-ink mb-2">Meno</label>
        <input className="field-input" value={name} onChange={(e) => setName(e.target.value)} required />
      </div>

      <div>
        <label className="block text-sm font-semibold text-ink mb-2">O mne</label>
        <textarea
          className="field-input min-h-[140px]"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          maxLength={1000}
          placeholder="Napíš pár viet o sebe…"
        />
        <div className="text-xs text-muted mt-1.5 text-right">{bio.length}/1000</div>
      </div>

      {error && <div className="text-danger text-sm">{error}</div>}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={loading}
          className="bg-accent text-white px-6 py-3 rounded-full text-sm font-semibold hover:bg-accent-dark disabled:opacity-50"
        >
          {loading ? 'Ukladám…' : 'Uložiť profil'}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="border border-line text-muted px-6 py-3 rounded-full text-sm font-semibold hover:text-ink hover:border-ink"
        >
          Zrušiť
        </button>
      </div>
    </form>
    </>
  );
}
