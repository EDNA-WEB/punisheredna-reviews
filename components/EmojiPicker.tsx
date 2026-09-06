'use client';

import { useState, useRef, useEffect } from 'react';

const EMOJIS = ['😀', '😂', '😍', '😉', '😢', '😮', '😡', '👍', '👎', '❤️', '🔥', '🎉', '🙏', '👏', '😎', '🤔', '😴', '🥳', '😱', '🤝'];

export default function EmojiPicker({ onPick, dark }: { onPick: (emoji: string) => void; dark?: boolean }) {
  const [open, setOpen] = useState(false);
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
        className={`w-9 h-9 flex-none rounded-full flex items-center justify-center transition-colors ${
          dark ? 'text-[#8696a0] hover:text-white' : 'text-muted hover:text-accent'
        }`}
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
        <div
          className="absolute bottom-full left-0 mb-2 grid grid-cols-5 gap-1 p-2 rounded-xl shadow-lg z-20"
          style={{ backgroundColor: dark ? '#233138' : 'white', border: dark ? '1px solid rgba(0,0,0,0.3)' : '1px solid #e5e5e5' }}
        >
          {EMOJIS.map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => {
                onPick(e);
                setOpen(false);
              }}
              className="w-9 h-9 text-xl flex items-center justify-center rounded-lg hover:bg-black/10 transition-colors"
            >
              {e}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
