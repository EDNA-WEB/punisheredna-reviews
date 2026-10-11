'use client';

import { useState } from 'react';
import { useT } from '../TranslationProvider';
import { ApPlay } from './ArticleIcons';

// Titulný obrázok článku v úvodnej karte. Ak má film v článku trailer,
// tlačidlo ho prehrá priamo na mieste (bez odchodu na YouTube, hneď sa spustí).
export default function CoverTrailer({ cover, alt, youtubeId }: { cover: string | null; alt: string; youtubeId: string | null }) {
  const t = useT();
  const [playing, setPlaying] = useState(false);

  if (playing && youtubeId) {
    return (
      <div className="ap-cover">
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${youtubeId}?autoplay=1&rel=0&playsinline=1`}
          title={alt}
          className="absolute inset-0 w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  return (
    <div className="ap-cover">
      {cover ? <img src={cover} alt={alt} className="absolute inset-0 w-full h-full object-cover" /> : <div className="absolute inset-0 bg-night" />}
      <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
      {youtubeId && (
        <button type="button" onClick={() => setPlaying(true)} className="ap-glass ap-play">
          <span className="ap-play-dot">
            <ApPlay className="w-4 h-4" />
          </span>
          {t('clanok.prehrat_trailer', 'Přehrát trailer')}
        </button>
      )}
    </div>
  );
}
