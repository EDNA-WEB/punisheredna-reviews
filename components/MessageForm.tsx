'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { IconImage } from './Icons';
import { useT } from './TranslationProvider';

export default function MessageForm({ receiverId, disabledReason }: { receiverId: string; disabledReason?: string | null }) {
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

  if (disabledReason) {
    return (
      <div className="border-t border-line pt-4 pb-1 text-center">
        <p className="text-sm text-muted">{disabledReason}</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="border-t border-line pt-3">
      {image && (
        <div className="mb-3 relative w-fit">
          <img src={image} alt={t('spravy.nahlad')} className="max-h-40 rounded-xl border border-line" />
          <button type="button" onClick={() => setImage('')} className="absolute -top-2 -right-2 w-6 h-6 bg-night text-white rounded-full text-xs">✕</button>
        </div>
      )}
      <div className="flex items-end gap-2 bg-surface rounded-full pl-2 pr-1.5 py-1.5">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="w-9 h-9 flex-none rounded-full flex items-center justify-center text-muted hover:text-accent transition-colors"
          title={t('spravy.pridat_fotku')}
        >
          <IconImage className="w-5 h-5" />
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImage} />
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t('spravy.napis_spravu')}
          className="flex-1 min-h-[36px] max-h-32 bg-transparent border-0 outline-none resize-none text-sm py-1.5 placeholder:text-muted"
          rows={1}
        />
        <button
          type="submit"
          disabled={loading || (!text.trim() && !image)}
          className="w-9 h-9 flex-none bg-accent text-white rounded-full flex items-center justify-center hover:bg-accent-dark disabled:opacity-40 transition-colors"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </div>
      {error && <div className="text-danger text-sm mt-2 text-center">{error}</div>}
    </form>
  );
}
