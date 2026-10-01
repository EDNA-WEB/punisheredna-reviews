'use client';

import { useEffect, useRef, useState } from 'react';

// Prehrávač hlasovky na webe. Web hlasovky LEN prehráva — nahrávať sa dajú
// iba v appke. Prvé spustenie príjemcom spustí 5-minútový odpočet do zmazania.

export type VoiceInfo = {
  duration: number;
  waveform: number[];
  expiresAt: string | null;
  listenedAt: string | null;
  available: boolean;
};

const BARS = 36;
const RATES = [1, 1.5, 2];
const PLAY_EVENT = 'voice-message-play';

function fmt(ms: number) {
  const total = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

function fmtRemaining(ms: number) {
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  if (totalSec >= 3600) {
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    return `${h} h ${m} min`;
  }
  return `${Math.floor(totalSec / 60)}:${String(totalSec % 60).padStart(2, '0')}`;
}

function resample(values: number[], count: number) {
  if (!values.length) return Array.from({ length: count }, () => 18);
  return Array.from({ length: count }, (_, i) => {
    const v = values[Math.min(values.length - 1, Math.floor((i / count) * values.length))];
    return Math.max(10, Math.min(100, v));
  });
}

export default function VoiceMessagePlayer({ id, mine, voice }: { id: string; mine: boolean; voice: VoiceInfo }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [position, setPosition] = useState(0); // ms
  const [rate, setRate] = useState(1);
  const [error, setError] = useState('');
  const [local, setLocal] = useState<{ expiresAt: string | null; listenedAt: string | null }>({ expiresAt: null, listenedAt: null });
  const [gone, setGone] = useState(false);

  // Server môže medzičasom poslať novší stav — berieme ten kratší čas.
  const expiresAt = [voice.expiresAt, local.expiresAt]
    .filter(Boolean)
    .map((x) => new Date(x as string).getTime())
    .reduce((a, b) => Math.min(a, b), Infinity);
  const listenedAt = voice.listenedAt || local.listenedAt;
  const remaining = Number.isFinite(expiresAt) ? expiresAt - now : 0;
  const available = voice.available && !gone && remaining > 0;
  const durationMs = voice.duration || 1;

  useEffect(() => {
    if (!voice.available) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [voice.available]);

  // Čas vypršal → okamžite zastaviť a zahodiť zvuk z pamäte.
  useEffect(() => {
    if (available) return;
    const a = audioRef.current;
    if (a) {
      a.pause();
      a.removeAttribute('src');
      a.load();
    }
    setPlaying(false);
  }, [available]);

  // Naraz hrá len jedna hlasovka.
  useEffect(() => {
    function onOther(e: Event) {
      if ((e as CustomEvent).detail !== id) audioRef.current?.pause();
    }
    window.addEventListener(PLAY_EVENT, onOther);
    return () => window.removeEventListener(PLAY_EVENT, onOther);
  }, [id]);

  async function ensureSource(): Promise<boolean> {
    const a = audioRef.current;
    if (!a) return false;
    if (a.getAttribute('src')) return true;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/messages/${id}/voice`, { method: 'POST', cache: 'no-store' });
      const data = await res.json().catch(() => ({}));
      if (res.status === 410) {
        setGone(true);
        return false;
      }
      if (!res.ok || !data.url) {
        setError(data.error || 'Hlasovku se nepodařilo přehrát.');
        return false;
      }
      setLocal({ expiresAt: data.expiresAt, listenedAt: data.listenedAt });
      a.src = data.url;
      a.playbackRate = rate;
      return true;
    } catch {
      setError('Hlasovku se nepodařilo přehrát.');
      return false;
    } finally {
      setLoading(false);
    }
  }

  async function toggle() {
    const a = audioRef.current;
    if (!a || !available) return;
    if (playing) {
      a.pause();
      return;
    }
    if (!(await ensureSource())) return;
    window.dispatchEvent(new CustomEvent(PLAY_EVENT, { detail: id }));
    try {
      await a.play();
    } catch {
      // Odkaz mohol medzičasom vypršať (10 min) — skús raz nový.
      a.removeAttribute('src');
      if (await ensureSource()) await a.play().catch(() => setError('Hlasovku se nepodařilo přehrát.'));
    }
  }

  async function seek(e: React.MouseEvent<HTMLDivElement>) {
    if (!available) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const frac = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    const a = audioRef.current;
    if (!a) return;
    if (!a.getAttribute('src') && !(await ensureSource())) return;
    a.currentTime = (frac * durationMs) / 1000;
    setPosition(frac * durationMs);
    if (!playing) {
      window.dispatchEvent(new CustomEvent(PLAY_EVENT, { detail: id }));
      a.play().catch(() => {});
    }
  }

  function cycleRate() {
    const next = RATES[(RATES.indexOf(rate) + 1) % RATES.length];
    setRate(next);
    if (audioRef.current) audioRef.current.playbackRate = next;
  }

  if (!available) {
    return (
      <div className={`flex items-center gap-2 rounded-xl px-3 py-2.5 mb-1.5 ${mine ? 'bg-black/15' : 'bg-line/50'}`}>
        <span className={`text-xs italic ${mine ? 'text-white/70' : 'text-muted'}`}>🎤 Hlasová zpráva vypršela</span>
      </div>
    );
  }

  const bars = resample(voice.waveform, BARS);
  const progress = Math.min(1, position / durationMs);
  const status = mine
    ? `${listenedAt ? 'Poslechnuto' : 'Neposlechnuto'} · zmizí za ${fmtRemaining(remaining)}`
    : `Zmizí za ${fmtRemaining(remaining)}`;

  return (
    <div className="mb-1 min-w-[220px] max-w-[300px]">
      <div className="flex items-center gap-2.5">
        <button
          type="button"
          onClick={toggle}
          disabled={loading}
          aria-label={playing ? 'Pozastavit' : 'Přehrát'}
          className={`flex-none w-9 h-9 rounded-full flex items-center justify-center transition ${
            mine ? 'bg-white text-black' : 'bg-accent text-white'
          } hover:opacity-90 disabled:opacity-60`}
        >
          {loading ? (
            <span className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
          ) : playing ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M6 4h4v16H6zM14 4h4v16h-4z" /></svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M7 4.5v15l13-7.5z" /></svg>
          )}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-[2px] h-7 cursor-pointer" onClick={seek} role="slider" aria-valuenow={Math.round(progress * 100)}>
            {bars.map((h, i) => {
              const played = (i + 0.5) / bars.length <= progress;
              return (
                <span
                  key={i}
                  className={`flex-1 rounded-full ${
                    played ? (mine ? 'bg-white' : 'bg-accent') : mine ? 'bg-white/40' : 'bg-muted/40'
                  }`}
                  style={{ height: `${Math.max(12, h)}%` }}
                />
              );
            })}
          </div>
          <div className={`flex items-center justify-between mt-0.5 text-[10.5px] ${mine ? 'text-white/75' : 'text-muted'}`}>
            <span className="tabular-nums">{playing || position > 0 ? fmt(position) : fmt(durationMs)}</span>
            <span className="truncate ml-2">{status}</span>
          </div>
        </div>

        <button
          type="button"
          onClick={cycleRate}
          className={`flex-none text-[11px] font-bold tabular-nums rounded-full px-2 py-0.5 ${mine ? 'bg-black/20 text-white' : 'bg-line/60 text-ink'}`}
          aria-label="Rychlost přehrávání"
        >
          {rate}×
        </button>
      </div>
      {error && <div className={`text-[11px] mt-1 ${mine ? 'text-white' : 'text-danger'}`}>{error}</div>}

      <audio
        ref={audioRef}
        preload="none"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onTimeUpdate={(e) => setPosition(e.currentTarget.currentTime * 1000)}
        onEnded={(e) => {
          setPlaying(false);
          setPosition(0);
          e.currentTarget.currentTime = 0;
        }}
        onError={() => {
          if (audioRef.current?.getAttribute('src')) setError('Hlasovku se nepodařilo přehrát.');
        }}
      />
    </div>
  );
}
