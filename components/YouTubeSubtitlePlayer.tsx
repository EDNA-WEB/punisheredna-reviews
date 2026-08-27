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

type Subtitle = { startTime: number; endTime: number; text: string };

export default function YouTubeSubtitlePlayer({ videoId, subtitles, title, fill }: { videoId: string; subtitles: Subtitle[]; title?: string; fill?: boolean }) {
  const mountRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [currentText, setCurrentText] = useState('');

  useEffect(() => {
    let cancelled = false;

    loadYouTubeApi().then(() => {
      if (cancelled || !mountRef.current) return;
      playerRef.current = new window.YT.Player(mountRef.current, {
        videoId,
        playerVars: { rel: 0 },
        events: {
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
      if (intervalRef.current) clearInterval(intervalRef.current);
      playerRef.current?.destroy?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId]);

  return (
    <div className={fill ? 'absolute inset-0' : 'relative rounded-xl overflow-hidden bg-night aspect-video'}>
      <div ref={mountRef} className="absolute inset-0 w-full h-full" title={title} />
      {currentText && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 max-w-[92%] pointer-events-none">
          <span className="inline-block bg-black/80 text-white text-sm sm:text-base px-3 py-1.5 rounded text-center leading-snug">
            {currentText}
          </span>
        </div>
      )}
    </div>
  );
}
