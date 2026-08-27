'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { IconImage } from './Icons';
import { useT } from './TranslationProvider';

export default function MessageForm({ receiverId }: { receiverId: string }) {
  const t = useT();
  const router = useRouter();
  const [text, setText] = useState('');
  const [image, setImage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const maxW = 900;
        const scale = Math.min(1, maxW / img.width);
        const canvas = document.createElement('canvas');
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        setImage(canvas.toDataURL('image/webp', 0.8));
      };
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(file);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() && !image) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receiverId, body: text, image })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t('spravy.odoslanie_zlyhalo'));
      setText('');
      setImage('');
      if (fileRef.current) fileRef.current.value = '';
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="border-t border-line pt-4">
      {image && (
        <div className="mb-3 relative w-fit">
          <img src={image} alt={t('spravy.nahlad')} className="max-h-40 rounded-xl border border-line" />
          <button type="button" onClick={() => setImage('')} className="absolute -top-2 -right-2 w-6 h-6 bg-night text-white rounded-full text-xs">✕</button>
        </div>
      )}
      <div className="flex items-end gap-2">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="w-11 h-11 flex-none rounded-full border border-line flex items-center justify-center hover:border-accent hover:text-accent"
          title={t('spravy.pridat_fotku')}
        >
          <IconImage className="w-5 h-5" />
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImage} />
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t('spravy.napis_spravu')}
          className="field-input flex-1 min-h-[44px] max-h-32"
          rows={1}
        />
        <button
          type="submit"
          disabled={loading || (!text.trim() && !image)}
          className="h-11 px-5 flex-none bg-accent text-white rounded-full text-sm font-semibold hover:bg-accent-dark disabled:opacity-50"
        >
          {t('spravy.odoslat')}
        </button>
      </div>
      {error && <div className="text-danger text-sm mt-2">{error}</div>}
    </form>
  );
}
