'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { IconImage } from './Icons';
import EmojiPicker from './EmojiPicker';
import { useT } from './TranslationProvider';

export default function MessageForm({
  receiverId,
  disabledReason,
  dark
}: {
  receiverId: string;
  disabledReason?: string | null;
  dark?: boolean;
}) {
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
      <div className={`pt-1 pb-1 text-center ${dark ? '' : 'border-t border-line pt-4'}`}>
        <p className={`text-sm ${dark ? 'text-[#8696a0]' : 'text-muted'}`}>{disabledReason}</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit}>
      {image && (
        <div className="mb-3 relative w-fit">
          <img src={image} alt={t('spravy.nahlad')} className="max-h-40 rounded-xl border border-line" />
          <button type="button" onClick={() => setImage('')} className="absolute -top-2 -right-2 w-6 h-6 bg-night text-white rounded-full text-xs">✕</button>
        </div>
      )}
      <div
        className={`flex items-end gap-1 rounded-full pl-1.5 pr-1.5 py-1.5 ${dark ? '' : 'bg-surface'}`}
        style={dark ? { backgroundColor: '#2a3942' } : undefined}
      >
        <EmojiPicker dark={dark} onPick={(e) => setText((prev) => prev + e)} />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className={`w-9 h-9 flex-none rounded-full flex items-center justify-center transition-colors ${
            dark ? 'text-[#8696a0] hover:text-white' : 'text-muted hover:text-accent'
          }`}
          title={t('spravy.pridat_fotku')}
        >
          <IconImage className="w-5 h-5" />
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImage} />
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              submit(e as any);
            }
          }}
          placeholder={t('spravy.napis_spravu')}
          className={`flex-1 min-h-[36px] max-h-32 bg-transparent border-0 outline-none resize-none text-sm py-1.5 ${
            dark ? 'text-[#e9edef] placeholder:text-[#8696a0]' : 'placeholder:text-muted'
          }`}
          rows={1}
        />
        {text.trim() || image ? (
          <button
            type="submit"
            disabled={loading}
            className={`w-9 h-9 flex-none rounded-full flex items-center justify-center disabled:opacity-40 transition-colors ${
              dark ? 'bg-[#00a884] text-white hover:bg-[#029271]' : 'bg-accent text-white hover:bg-accent-dark'
            }`}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => alert('Hlasové správy zatiaľ nie sú dostupné.')}
            className={`w-9 h-9 flex-none rounded-full flex items-center justify-center transition-colors ${
              dark ? 'text-[#8696a0] hover:text-white' : 'text-muted hover:text-accent'
            }`}
            title="Hlasová správa"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="23" />
              <line x1="8" y1="23" x2="16" y2="23" />
            </svg>
          </button>
        )}
      </div>
      {error && <div className="text-danger text-sm mt-2 text-center">{error}</div>}
    </form>
  );
}
