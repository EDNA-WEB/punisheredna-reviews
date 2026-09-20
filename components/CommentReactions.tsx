'use client';

import { useState, useRef, useEffect } from 'react';

// Vlastné, ploché SVG ikonky namiesto štandardného emoji písma — vyzerajú
// rovnako a čisto na každom zariadení/prehliadači, nie "stráckovo" ako
// natívne emoji (tie sa navyše na rôznych systémoch zobrazujú inak).
const REACTIONS: { key: string; label: string; color: string; icon: JSX.Element }[] = [
  {
    key: 'like',
    label: 'Páči sa mi',
    color: '#2563EB',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M7 11v9H4a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1h3zm0 0 5-7a2 2 0 0 1 3.8.9l-.7 4.1H18a2 2 0 0 1 2 2.3l-1.2 6A2 2 0 0 1 16.8 20H7" />
      </svg>
    )
  },
  {
    key: 'love',
    label: 'Milujem',
    color: '#DC2626',
    icon: (
      <svg viewBox="0 0 24 24" fill="white">
        <path d="M12 20.5c-.3 0-.6-.1-.8-.3C7.6 16.8 4 13.4 4 9.6 4 6.9 6.1 5 8.6 5c1.4 0 2.7.6 3.4 1.7C12.7 5.6 14 5 15.4 5 17.9 5 20 6.9 20 9.6c0 3.8-3.6 7.2-7.2 10.6-.2.2-.5.3-.8.3z" />
      </svg>
    )
  },
  {
    key: 'haha',
    label: 'Haha',
    color: '#F59E0B',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
        <circle cx="12" cy="12" r="9" />
        <path d="M8.5 10h.01M15.5 10h.01" strokeWidth="2.5" />
        <path d="M7.5 14c1 1.8 2.7 3 4.5 3s3.5-1.2 4.5-3" fill="none" />
      </svg>
    )
  },
  {
    key: 'wow',
    label: 'Wow',
    color: '#F59E0B',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
        <circle cx="12" cy="12" r="9" />
        <circle cx="8.5" cy="10" r="1" fill="white" stroke="none" />
        <circle cx="15.5" cy="10" r="1" fill="white" stroke="none" />
        <circle cx="12" cy="15" r="1.8" fill="none" />
      </svg>
    )
  },
  {
    key: 'sad',
    label: 'Smutné',
    color: '#F59E0B',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
        <circle cx="12" cy="12" r="9" />
        <path d="M8.5 10h.01M15.5 10h.01" strokeWidth="2.5" />
        <path d="M8.5 16c1-1.3 2.5-2 3.5-2s2.5.7 3.5 2" fill="none" />
      </svg>
    )
  },
  {
    key: 'angry',
    label: 'Nahnevaný',
    color: '#EA580C',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
        <circle cx="12" cy="12" r="9" />
        <path d="M7.5 9.5l2.5 1M16.5 9.5L14 10.5" />
        <path d="M8.5 16c1-1.3 2.5-2 3.5-2s2.5.7 3.5 2" fill="none" />
      </svg>
    )
  }
];

type ReactionCount = { emoji: string; count: number };

export default function CommentReactions({
  commentId,
  initialReactions,
  myReaction: initialMyReaction,
  isMember
}: {
  commentId: string;
  initialReactions: ReactionCount[];
  myReaction: string | null;
  isMember: boolean;
}) {
  const [reactions, setReactions] = useState(initialReactions);
  const [myReaction, setMyReaction] = useState(initialMyReaction);
  const [pickerOpen, setPickerOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) setPickerOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  async function pick(emoji: string) {
    setPickerOpen(false);
    if (myReaction === emoji) {
      // Opätovné kliknutie na tú istú reakciu ju odoberie — presne ako WhatsApp.
      setReactions((prev) => prev.map((r) => (r.emoji === emoji ? { ...r, count: r.count - 1 } : r)).filter((r) => r.count > 0));
      setMyReaction(null);
      await fetch(`/api/comments/${commentId}/react`, { method: 'DELETE' }).catch(() => {});
      return;
    }
    const prevReaction = myReaction;
    setReactions((prev) => {
      let next = prev.map((r) => (r.emoji === prevReaction ? { ...r, count: r.count - 1 } : r)).filter((r) => r.count > 0);
      const existing = next.find((r) => r.emoji === emoji);
      if (existing) next = next.map((r) => (r.emoji === emoji ? { ...r, count: r.count + 1 } : r));
      else next = [...next, { emoji, count: 1 }];
      return next;
    });
    setMyReaction(emoji);
    try {
      const res = await fetch(`/api/comments/${commentId}/react`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emoji })
      });
      const data = await res.json();
      if (res.ok) setReactions(data.reactions);
    } catch {
      // Necháme optimistický stav — nie je to natoľko dôležité, aby stálo za rušivú chybovú hlášku.
    }
  }

  const totalCount = reactions.reduce((sum, r) => sum + r.count, 0);

  return (
    <div className="relative flex items-center gap-2 mt-1" ref={pickerRef}>
      {isMember ? (
        <button
          type="button"
          onClick={() => setPickerOpen((o) => !o)}
          className={`text-xs font-semibold ${myReaction ? 'text-accent' : 'text-muted hover:text-ink'}`}
        >
          {myReaction ? REACTIONS.find((r) => r.key === myReaction)?.label : 'Reagovať'}
        </button>
      ) : (
        <span className="text-xs text-muted italic">Reakcie sú pre Golden Ticket členov</span>
      )}

      {totalCount > 0 && (
        <div className="flex items-center gap-1">
          {reactions
            .sort((a, b) => b.count - a.count)
            .map((r) => {
              const def = REACTIONS.find((d) => d.key === r.emoji);
              if (!def) return null;
              return (
                <span
                  key={r.emoji}
                  title={`${def.label}: ${r.count}`}
                  className="w-5 h-5 rounded-full flex items-center justify-center flex-none"
                  style={{ backgroundColor: def.color }}
                >
                  <span className="w-3 h-3">{def.icon}</span>
                </span>
              );
            })}
          <span className="text-xs text-muted">{totalCount}</span>
        </div>
      )}

      {pickerOpen && (
        <div className="absolute bottom-full left-0 mb-2 bg-card border border-line rounded-full shadow-lg px-2 py-1.5 flex items-center gap-1 z-10">
          {REACTIONS.map((r) => (
            <button
              key={r.key}
              type="button"
              onClick={() => pick(r.key)}
              title={r.label}
              className="w-8 h-8 rounded-full flex items-center justify-center flex-none hover:scale-125 transition-transform"
              style={{ backgroundColor: r.color }}
            >
              <span className="w-5 h-5">{r.icon}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
