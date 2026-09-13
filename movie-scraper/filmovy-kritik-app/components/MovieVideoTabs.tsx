'use client';

import { useState } from 'react';
import YouTubeSubtitlePlayer from './YouTubeSubtitlePlayer';

type Subtitle = { startTime: number; endTime: number; text: string };
type Video = { id: string; title: string | null; youtubeId: string; subtitles: Subtitle[] };
type Group = { key: string; label: string; videos: Video[] };

export default function MovieVideoTabs({ groups }: { groups: Group[] }) {
  const nonEmpty = groups.filter((g) => g.videos.length > 0);
  const [active, setActive] = useState(nonEmpty[0]?.key);
  const activeGroup = nonEmpty.find((g) => g.key === active);

  if (nonEmpty.length === 0) return null;

  return (
    <div>
      <div className="flex items-center gap-1 mb-4 flex-wrap border-b border-line">
        {nonEmpty.map((g) => (
          <button
            key={g.key}
            onClick={() => setActive(g.key)}
            className={`text-sm font-semibold px-3.5 py-2 border-b-2 -mb-px whitespace-nowrap transition-colors ${
              active === g.key ? 'text-ink border-accent' : 'text-muted border-transparent hover:text-ink'
            }`}
          >
            {g.label} <span className="text-xs text-muted">({g.videos.length})</span>
          </button>
        ))}
      </div>

      <div className="space-y-6">
        {activeGroup?.videos.map((v) => (
          <div key={v.id} className="max-w-2xl">
            {v.title && <div className="text-sm font-semibold text-ink mb-2">{v.title}</div>}
            <YouTubeSubtitlePlayer videoId={v.youtubeId} subtitles={v.subtitles} title={v.title || undefined} />
          </div>
        ))}
      </div>
    </div>
  );
}
