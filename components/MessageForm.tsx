'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { IconImage } from './Icons';
import EmojiPicker from './EmojiPicker';
import { useT } from './TranslationProvider';

export default function MessageForm({ receiverId, disabledReason }: { receiverId: string; disabledReason?: string | null }) {
  const t = useT();
  const router = useRouter();
  const [text, setText] = useState('');
  // Fotky čakajúce na odoslanie (max. 5 naraz, 10 za deň, zostanú 24 h).
  const [images, setImages] = useState<string[]>([]);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  // "Píše…" pre druhú stranu — ping najviac raz za 2,5 s počas písania.
  const lastTypingPing = useRef(0);
  const stopTypingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function sendTyping(typing: boolean) {
    fetch('/api/messages/typing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ receiverId, typing })
    }).catch(() => {});
  }

  function onTextChange(value: string) {
    setText(value);
    const now = Date.now();
    if (value.trim() && now - lastTypingPing.current > 2500) {
      lastTypingPing.current = now;
      sendTyping(true);
    }
    if (stopTypingTimer.current) clearTimeout(stopTypingTimer.current);
    stopTypingTimer.current = setTimeout(() => {
      lastTypingPing.current = 0;
      sendTyping(false);
    }, 4000);
  }

  function processImageFile(file: File) {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const maxSide = 1600;
        const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        const data = canvas.toDataURL('image/webp', 0.8);
        setImages((prev) => (prev.length >= 5 ? prev : [...prev, data]));
      };
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(file);
  }

  function handleImage(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []).filter((f) => f.type.startsWith('image/'));
    const free = 5 - images.length;
    if (files.length > free) setError('Najednou můžeš poslat maximálně 5 fotek.');
    else setError('');
    files.slice(0, Math.max(0, free)).forEach(processImageFile);
    e.target.value = '';
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() && images.length === 0) return;
    setLoading(true);
    setError('');
    // Každá fotka = jedna správa; text sa pripojí k poslednej fotke.
    const queue = images.length ? [...images] : [null];
    let sent = 0;
    try {
      for (let i = 0; i < queue.length; i++) {
        if (queue.length > 1) setProgress(`${i + 1}/${queue.length}`);
        const isLast = i === queue.length - 1;
        // Text sa šifruje na serveri (spoľahlivo, bez ohľadu na zariadenie).
        const res = await fetch('/api/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ receiverId, body: isLast ? text.trim() || null : null, image: queue[i] })
        });
        let data: any = {};
        try {
          data = await res.json();
        } catch {
          throw new Error(res.status === 413 ? 'Soubor je příliš velký na odeslání.' : `Server odpovedal neočakávane (${res.status}).`);
        }
        if (!res.ok) throw new Error(data.error || t('spravy.odoslanie_zlyhalo'));
        sent++;
      }
      setText('');
      if (stopTypingTimer.current) clearTimeout(stopTypingTimer.current);
      lastTypingPing.current = 0;
      setImages([]);
    } catch (err: any) {
      setError(err.message);
      // Odoslané fotky z poradia vyhodíme, neodoslané ostanú na opakovanie.
      if (images.length && sent > 0) setImages((prev) => prev.slice(sent));
    } finally {
      setLoading(false);
      setProgress('');
      if (sent > 0) router.refresh();
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
      {images.length > 0 && (
        <div className="mb-3">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {images.map((src, i) => (
              <div key={i} className="relative flex-none">
                <img src={src} alt={t('spravy.nahlad')} className="h-24 w-24 object-cover rounded-xl border border-line" />
                <button
                  type="button"
                  onClick={() => setImages((prev) => prev.filter((_, j) => j !== i))}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-night text-white rounded-full text-xs"
                  aria-label="Odebrat"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
          <div className="text-[11px] text-muted mt-1">
            {images.length}/5 · fotky zmizí za 24 h{progress ? ` · odesílám ${progress}` : ''}
          </div>
        </div>
      )}

      <div className="flex items-end gap-1 bg-surface rounded-full pl-1.5 pr-1.5 py-1.5">
        <EmojiPicker onPick={(e) => setText((prev) => prev + e)} />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="w-9 h-9 flex-none rounded-full flex items-center justify-center text-muted hover:text-accent transition-colors"
          title={t('spravy.pridat_fotku')}
        >
          <IconImage className="w-5 h-5" />
        </button>
        <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImage} />

        <button
          type="button"
          onClick={() => cameraRef.current?.click()}
          className="sm:hidden w-9 h-9 flex-none rounded-full flex items-center justify-center text-muted hover:text-accent transition-colors"
          title="Vyfotit a poslat"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
            <circle cx="12" cy="13" r="4" />
          </svg>
        </button>
        <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleImage} />

        <textarea
          value={text}
          onChange={(e) => onTextChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              submit(e as any);
            }
          }}
          placeholder={t('spravy.napis_spravu')}
          className="flex-1 min-h-[36px] max-h-32 bg-transparent border-0 outline-none resize-none text-sm py-1.5 placeholder:text-muted"
          rows={1}
        />

        <button
          type="submit"
          disabled={loading || (!text.trim() && images.length === 0)}
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
