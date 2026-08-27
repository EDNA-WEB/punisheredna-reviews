'use client';

import { useState, useRef, useEffect } from 'react';
import { IconChevronDown, IconLock, IconPlay } from './Icons';

type EpisodeItem = { number: number; title: string | null; onlineImage: string | null; onlineUrl?: string | null; watched?: boolean };
type SeasonItem = { number: number; year: string | null; released: boolean; episodes: EpisodeItem[] };

export default function OnlineEpisodeBrowser({
  seasons,
  watchUrl,
  defaultSeasonNumber
}: {
  seasons: SeasonItem[];
  watchUrl: string;
  defaultSeasonNumber?: number;
}) {
  const [selectedSeason, setSelectedSeason] = useState(defaultSeasonNumber ?? seasons[0]?.number);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const season = seasons.find((s) => s.number === selectedSeason) || seasons[0];

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  if (!season) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display font-bold text-lg text-ink">Epizódy online</h3>
        {seasons.length > 1 && (
          <div className="relative" ref={ref}>
            <button
              onClick={() => setOpen((o) => !o)}
              className="flex items-center gap-1.5 text-sm font-semibold text-ink border border-line rounded-full px-3.5 py-1.5 hover:border-accent transition-colors"
            >
              Séria {season.number}
              <IconChevronDown className="w-3.5 h-3.5" />
            </button>
            {open && (
              <div className="absolute right-0 mt-1.5 bg-card border border-line rounded-xl overflow-hidden shadow-xl z-10 min-w-[140px]">
                {seasons.map((s) => (
                  <button
                    key={s.number}
                    onClick={() => {
                      setSelectedSeason(s.number);
                      setOpen(false);
                    }}
                    className={`block w-full text-left px-4 py-2.5 text-sm transition-colors ${
                      s.number === selectedSeason ? 'text-accent font-semibold bg-surface' : 'text-ink hover:bg-surface'
                    }`}
                  >
                    Séria {s.number} {s.year && <span className="text-muted font-normal">· {s.year}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {season.episodes.map((e) => {
          const code = `S${String(season.number).padStart(2, '0')}E${String(e.number).padStart(2, '0')}`;
          const clickable = season.released;
          const episodeUrl = e.onlineUrl || watchUrl;
          const Wrapper = clickable ? 'a' : 'div';
          return (
            <Wrapper
              key={e.number}
              {...(clickable ? { href: episodeUrl, target: '_blank', rel: 'noopener noreferrer' } : {})}
              className={`block group ${clickable ? '' : 'cursor-default'}`}
            >
              <div className="relative aspect-video rounded-xl overflow-hidden bg-night mb-2">
                {e.onlineImage && (
                  <div
                    className={`absolute inset-0 bg-cover bg-center ${clickable ? 'transition-transform duration-300 group-hover:scale-105' : ''}`}
                    style={{ backgroundImage: `url('${e.onlineImage}')` }}
                  />
                )}
                {clickable ? (
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                    <span className="w-10 h-10 rounded-full bg-white/0 group-hover:bg-white/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                      <IconPlay className="w-4 h-4 ml-0.5 text-night" />
                    </span>
                  </div>
                ) : (
                  <div className="absolute inset-0 bg-black/55 flex items-center justify-center">
                    <IconLock className="w-5 h-5 text-white" />
                  </div>
                )}
                {e.watched && <div className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-500" />}
              </div>
              <div className="text-xs font-semibold text-muted">{code}</div>
              <div className={`text-sm font-semibold leading-snug line-clamp-1 ${clickable ? 'text-ink' : 'text-muted'}`}>
                {e.title || `Epizóda ${e.number}`}
              </div>
            </Wrapper>
          );
        })}
      </div>
    </div>
  );
}
