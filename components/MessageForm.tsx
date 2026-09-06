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
  const [image, setImage] = useState('');
  const [audio, setAudio] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  const [recording, setRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  function processImageFile(file: File) {
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

  function handleImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) processImageFile(file);
  }

  async function startRecording() {
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      recordedChunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) recordedChunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onload = () => setAudio(reader.result as string);
        reader.readAsDataURL(blob);
        streamRef.current?.getTracks().forEach((tr) => tr.stop());
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecording(true);
      setRecordSeconds(0);
      recordTimerRef.current = setInterval(() => {
        setRecordSeconds((s) => {
          const next = s + 1;
          if (next >= 60) {
            // Maximálna dĺžka hlasovky je 1 minúta — po jej dosiahnutí nahrávanie
            // samo ukončíme, nech to používateľ nemusí strážiť.
            setTimeout(() => stopRecording(), 0);
          }
          return next;
        });
      }, 1000);
    } catch {
      setError('Nepodarilo sa získať prístup k mikrofónu. Skontroluj povolenia prehliadača.');
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
    setRecording(false);
    if (recordTimerRef.current) clearInterval(recordTimerRef.current);
  }

  function cancelRecording() {
    mediaRecorderRef.current?.stop();
    setRecording(false);
    if (recordTimerRef.current) clearInterval(recordTimerRef.current);
    recordedChunksRef.current = [];
    setAudio('');
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() && !image && !audio) return;
    setLoading(true);
    setError('');
    try {
      // Text sa šifruje na serveri (spoľahlivo, bez ohľadu na zariadenie) —
      // stačí ho poslať tak, ako je, o zvyšok sa postará API.
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receiverId, body: text.trim() || null, image, audio })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t('spravy.odoslanie_zlyhalo'));
      setText('');
      setImage('');
      setAudio('');
      if (fileRef.current) fileRef.current.value = '';
      if (cameraRef.current) cameraRef.current.value = '';
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
      {audio && !recording && (
        <div className="mb-3 flex items-center gap-2 w-fit bg-surface border border-line rounded-full pl-3 pr-1.5 py-1.5">
          <audio src={audio} controls className="h-8" />
          <button type="button" onClick={() => setAudio('')} className="w-6 h-6 flex-none bg-night text-white rounded-full text-xs">✕</button>
        </div>
      )}

      {recording ? (
        <div className="flex items-center gap-3 bg-surface rounded-full px-4 py-2.5">
          <span className="w-2.5 h-2.5 rounded-full bg-danger animate-pulse flex-none" />
          <span className="text-sm text-ink flex-1">Nahrávam… {String(Math.floor(recordSeconds / 60)).padStart(2, '0')}:{String(recordSeconds % 60).padStart(2, '0')}</span>
          <button type="button" onClick={cancelRecording} className="text-xs font-semibold text-muted hover:text-ink px-2">
            Zrušiť
          </button>
          <button type="button" onClick={stopRecording} className="text-xs font-semibold text-white bg-accent px-4 py-1.5 rounded-full hover:bg-accent-dark">
            Hotovo
          </button>
        </div>
      ) : (
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
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImage} />

          <button
            type="button"
            onClick={() => cameraRef.current?.click()}
            className="sm:hidden w-9 h-9 flex-none rounded-full flex items-center justify-center text-muted hover:text-accent transition-colors"
            title="Odfotiť a poslať"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
          </button>
          <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleImage} />

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
            className="flex-1 min-h-[36px] max-h-32 bg-transparent border-0 outline-none resize-none text-sm py-1.5 placeholder:text-muted"
            rows={1}
          />

          {text.trim() || image || audio ? (
            <button
              type="submit"
              disabled={loading}
              className="w-9 h-9 flex-none bg-accent text-white rounded-full flex items-center justify-center hover:bg-accent-dark disabled:opacity-40 transition-colors"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          ) : (
            <button
              type="button"
              onClick={startRecording}
              className="sm:hidden w-9 h-9 flex-none rounded-full flex items-center justify-center text-muted hover:text-accent transition-colors"
              title="Nahrať hlasovú správu"
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
      )}
      {error && <div className="text-danger text-sm mt-2 text-center">{error}</div>}
    </form>
  );
}
