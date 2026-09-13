'use client';

import { useState, useRef, useEffect } from 'react';

const CATEGORIES: { label: string; icon: string; emojis: string[] }[] = [
  {
    label: 'Smajlíky',
    icon: '😀',
    emojis: ['😀', '😁', '😂', '🤣', '😊', '😉', '😍', '😘', '😎', '🤔', '😴', '😢', '😭', '😡', '😮', '😱', '🥳', '🤗', '🙄', '😅']
  },
  {
    label: 'Gestá',
    icon: '👍',
    emojis: ['👍', '👎', '👏', '🙏', '🤝', '✌️', '🤞', '👌', '💪', '🙌', '👋', '🤙']
  },
  {
    label: 'Srdcia',
    icon: '❤️',
    emojis: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '💕', '💔', '😻', '💯']
  },
  {
    label: 'Filmy a zábava',
    icon: '🎬',
    emojis: ['🎬', '🍿', '🎥', '📺', '🎭', '🎞️', '⭐', '🔥', '🎉', '🎊', '🏆', '👀']
  }
];

export default function EmojiPicker({ onPick }: { onPick: (emoji: string) => void }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-9 h-9 flex-none rounded-full flex items-center justify-center text-muted hover:text-accent transition-colors"
        title="Emotikony"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
          <circle cx="12" cy="12" r="10" />
          <path d="M8 14s1.5 2 4 2 4-2 4-2" />
          <line x1="9" y1="9" x2="9.01" y2="9" />
          <line x1="15" y1="9" x2="15.01" y2="9" />
        </svg>
      </button>
      {open && (
        <div className="absolute bottom-full left-0 mb-2 w-72 bg-card border border-line rounded-xl shadow-lg z-20 overflow-hidden">
          <div className="flex border-b border-line">
            {CATEGORIES.map((c, i) => (
              <button
                key={c.label}
                type="button"
                onClick={() => setTab(i)}
                title={c.label}
                className={`flex-1 py-2 text-lg flex items-center justify-center transition-colors ${
                  tab === i ? 'bg-surface border-b-2 border-accent' : 'hover:bg-surface'
                }`}
              >
                {c.icon}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-6 gap-1 p-3 max-h-48 overflow-y-auto">
            {CATEGORIES[tab].emojis.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => {
                  onPick(e);
                  setOpen(false);
                }}
                className="w-9 h-9 text-2xl flex items-center justify-center rounded-lg hover:bg-surface transition-colors leading-none"
              >
                {e}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
