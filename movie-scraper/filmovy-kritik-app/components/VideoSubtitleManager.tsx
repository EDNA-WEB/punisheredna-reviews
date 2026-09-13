'use client';

import { useEffect, useRef, useState } from 'react';

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

let apiLoading: Promise<void> | null = null;
function loadYouTubeApi(): Promise<void> {
  if (window.YT && window.YT.Player) return Promise.resolve();
  if (apiLoading) return apiLoading;
  apiLoading = new Promise((resolve) => {
    const prevCallback = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prevCallback?.();
      resolve();
    };
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    document.body.appendChild(tag);
  });
  return apiLoading;
}

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = (sec % 60).toFixed(1);
  return `${m}:${s.padStart(4, '0')}`;
}

type Subtitle = { id: string; startTime: number; endTime: number; text: string };

export default function VideoSubtitleManager({
  movieId,
  videoId,
  youtubeId,
  initialSubtitles
}: {
  movieId: string;
  videoId: string;
  youtubeId: string;
  initialSubtitles: Subtitle[];
}) {
  const mountRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const [ready, setReady] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [start, setStart] = useState<number | null>(null);
  const [end, setEnd] = useState<number | null>(null);
  const [text, setText] = useState('');
  const [subtitles, setSubtitles] = useState<Subtitle[]>(initialSubtitles.sort((a, b) => a.startTime - b.startTime));
  const draftActive = start !== null && end !== null && text.trim() && currentTime >= start && currentTime <= end;
  const activeCue = draftActive
    ? { text: text.trim() }
    : subtitles.find((s) => currentTime >= s.startTime && currentTime <= s.endTime) || null;
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadYouTubeApi().then(() => {
      if (cancelled || !mountRef.current) return;
      playerRef.current = new window.YT.Player(mountRef.current, {
        videoId: youtubeId,
        events: { onReady: () => setReady(true) }
      });
    });

    const interval = setInterval(() => {
      if (playerRef.current?.getCurrentTime) setCurrentTime(playerRef.current.getCurrentTime());
    }, 200);

    return () => {
      cancelled = true;
      clearInterval(interval);
      playerRef.current?.destroy?.();
    };
  }, [youtubeId]);

  async function addSubtitle() {
    if (start === null || end === null) {
      setError('Najprv nastav začiatok aj koniec.');
      return;
    }
    if (!text.trim()) {
      setError('Napíš text titulku.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`/api/movies/${movieId}/videos/${videoId}/subtitles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startTime: start, endTime: end, text: text.trim() })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Pridanie zlyhalo.');
      setSubtitles((prev) => [...prev, data].sort((a, b) => a.startTime - b.startTime));
      setStart(null);
      setEnd(null);
      setText('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function removeSubtitle(id: string) {
    setSubtitles((prev) => prev.filter((s) => s.id !== id));
    await fetch(`/api/movies/${movieId}/videos/${videoId}/subtitles/${id}`, { method: 'DELETE' }).catch(() => {});
  }

  return (
    <div className="border border-line rounded-xl overflow-hidden">
      <div className="bg-surface px-4 py-2.5 border-b border-line">
        <h2 className="font-display font-bold text-sm text-ink">Titulky k videu</h2>
      </div>

      <div className="p-4 space-y-4">
        <div className="relative rounded-lg overflow-hidden bg-night aspect-video max-w-md">
          <div ref={mountRef} className="absolute inset-0 w-full h-full" />
          {activeCue && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 max-w-[92%] pointer-events-none">
              <span className="inline-block bg-black/80 text-white text-sm px-3 py-1.5 rounded text-center leading-snug">
                {activeCue.text}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 flex-wrap text-sm">
          <span className="font-mono text-ink bg-surface border border-line rounded px-2 py-1">{formatTime(currentTime)}</span>
          <button
            type="button"
            onClick={() => setStart(currentTime)}
            disabled={!ready}
            className="text-xs font-semibold border border-line rounded-full px-3 py-1.5 hover:border-accent hover:text-accent disabled:opacity-50"
          >
            Nastaviť ako začiatok {start !== null && `(${formatTime(start)})`}
          </button>
          <button
            type="button"
            onClick={() => setEnd(currentTime)}
            disabled={!ready}
            className="text-xs font-semibold border border-line rounded-full px-3 py-1.5 hover:border-accent hover:text-accent disabled:opacity-50"
          >
            Nastaviť ako koniec {end !== null && `(${formatTime(end)})`}
          </button>
        </div>

        <div className="flex items-start gap-2">
          <input
            className="field-input-sm flex-1"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Text titulku pre tento úsek…"
            maxLength={300}
          />
          <button
            type="button"
            onClick={addSubtitle}
            disabled={saving}
            className="bg-accent text-white text-xs font-semibold px-4 py-1.5 rounded-full hover:bg-accent-dark disabled:opacity-50 flex-none"
          >
            {saving ? '…' : 'Pridať titulok'}
          </button>
        </div>
        {error && <div className="text-danger text-xs">{error}</div>}

        {subtitles.length > 0 && (
          <div className="border-t border-line pt-3">
            <div className="text-xs font-bold uppercase tracking-wide text-muted mb-2">Existujúce titulky ({subtitles.length})</div>
            <ul className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
              {subtitles.map((s) => (
                <li key={s.id} className="flex items-center gap-2 text-xs border-b border-line pb-1.5 last:border-b-0">
                  <span className="font-mono text-muted flex-none">{formatTime(s.startTime)}–{formatTime(s.endTime)}</span>
                  <span className="flex-1 truncate text-ink">{s.text}</span>
                  <button type="button" onClick={() => removeSubtitle(s.id)} className="text-muted hover:text-danger flex-none">✕</button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
