'use client';

import { useEffect, useRef, useState } from 'react';
import { IconPlay } from './Icons';

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

type Subtitle = { startTime: number; endTime: number; text: string };

// Prehrávač YouTube videí na webe.
// - Pred spustením ukazuje len náhľad s tlačidlom prehrať (rovnako ako trailer na
//   hlavnej stránke) — YouTube sa načíta až po kliknutí a video sa HNEĎ spustí,
//   netreba klikať druhýkrát do okna YouTube.
// - Používa youtube-nocookie.com (bez reklamných cookies), prehráva sa priamo na
//   stránke (aj na iPhone) a bez odkazov na ďalšie videá.
// - Ak prehliadač nepovolí spustenie so zvukom, video sa spustí stlmené
//   (zvuk sa zapne v ovládaní prehrávača).
// - autoPlay: spustiť hneď po zobrazení (použité tam, kde už používateľ klikol).
export default function YouTubeSubtitlePlayer({
  videoId,
  subtitles,
  title,
  fill,
  autoPlay,
  poster
}: {
  videoId: string;
  subtitles: Subtitle[];
  title?: string;
  fill?: boolean;
  autoPlay?: boolean;
  poster?: string | null;
}) {
  const [started, setStarted] = useState(!!autoPlay);
  const [thumb, setThumb] = useState(poster || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`);
  const mountRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [currentText, setCurrentText] = useState('');

  useEffect(() => {
    setStarted(!!autoPlay);
    setThumb(poster || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId]);

  useEffect(() => {
    if (!started) return;
    let cancelled = false;
    let fallbackTimer: ReturnType<typeof setTimeout> | null = null;

    loadYouTubeApi().then(() => {
      if (cancelled || !mountRef.current) return;
      // YouTube nahradí cieľový prvok svojím iframe — vytvoríme ho preto mimo
      // Reactu, nech React pri zmene videa neodstraňuje prvok, ktorý už nepozná.
      const target = document.createElement('div');
      mountRef.current.innerHTML = '';
      mountRef.current.appendChild(target);
      playerRef.current = new window.YT.Player(target, {
        videoId,
        host: 'https://www.youtube-nocookie.com',
        width: '100%',
        height: '100%',
        playerVars: {
          autoplay: 1,
          playsinline: 1,
          rel: 0,
          modestbranding: 1,
          origin: window.location.origin
        },
        events: {
          onReady: (e: any) => {
            // Absolútna poistka: YouTube niekedy iframe vytvorí s pevnou predvolenou
            // veľkosťou (640×360) bez ohľadu na width/height v nastaveniach vyššie —
            // tu jeho štýl prepíšeme priamo, nech sa to už nemôže stať.
            try {
              const iframe = e.target.getIframe();
              if (iframe) {
                iframe.style.width = '100%';
                iframe.style.height = '100%';
                iframe.style.position = 'absolute';
                iframe.style.inset = '0';
                iframe.removeAttribute('width');
                iframe.removeAttribute('height');
                if (title) iframe.title = title;
              }
            } catch {}
            try {
              e.target.playVideo();
            } catch {}
            // Prehliadač zablokoval spustenie so zvukom → spustíme stlmené.
            fallbackTimer = setTimeout(() => {
              try {
                const st = e.target.getPlayerState?.();
                if (st !== window.YT.PlayerState.PLAYING && st !== window.YT.PlayerState.BUFFERING) {
                  e.target.mute();
                  e.target.playVideo();
                }
              } catch {}
            }, 1500);
          },
          onStateChange: (e: any) => {
            if (intervalRef.current) clearInterval(intervalRef.current);
            if (e.data === window.YT.PlayerState.PLAYING) {
              intervalRef.current = setInterval(() => {
                if (!playerRef.current?.getCurrentTime) return;
                const t = playerRef.current.getCurrentTime();
                const cue = subtitles.find((s) => t >= s.startTime && t <= s.endTime);
                setCurrentText(cue?.text || '');
              }, 200);
            } else {
              setCurrentText('');
            }
          }
        }
      });
    });

    return () => {
      cancelled = true;
      if (fallbackTimer) clearTimeout(fallbackTimer);
      if (intervalRef.current) clearInterval(intervalRef.current);
      try {
        playerRef.current?.destroy?.();
      } catch {}
      playerRef.current = null;
      if (mountRef.current) mountRef.current.innerHTML = '';
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId, started]);

  return (
    <div className={fill ? 'absolute inset-0' : 'relative rounded-xl overflow-hidden bg-night aspect-video'}>
      <style jsx>{`
        div :global(iframe) {
          width: 100% !important;
          height: 100% !important;
          max-width: 100% !important;
        }
      `}</style>
      {started ? (
        <div ref={mountRef} className="absolute inset-0 w-full h-full" title={title} />
      ) : (
        <button
          type="button"
          onClick={() => setStarted(true)}
          aria-label={title ? `Přehrát: ${title}` : 'Přehrát video'}
          className="absolute inset-0 w-full h-full flex items-center justify-center group bg-night"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={thumb}
            alt=""
            loading="lazy"
            onError={() => {
              const fallback = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
              if (thumb !== fallback) setThumb(fallback);
            }}
            className="absolute inset-0 w-full h-full object-cover"
          />
          <span className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-black/25" />
          <span className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-white/90 flex items-center justify-center text-night group-hover:bg-white group-hover:scale-105 transition-all shadow-lg">
            <IconPlay className="w-6 h-6 sm:w-7 sm:h-7 ml-1" />
          </span>
        </button>
      )}
      {started && currentText && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 max-w-[92%] pointer-events-none">
          <span className="inline-block bg-black/80 text-white text-sm sm:text-base px-3 py-1.5 rounded text-center leading-snug">
            {currentText}
          </span>
        </div>
      )}
    </div>
  );
}
