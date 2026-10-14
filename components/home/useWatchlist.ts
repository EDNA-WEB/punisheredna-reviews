'use client';

import { createContext, createElement, useContext, useRef, useState, type ReactNode } from 'react';

// Spoločné „Chci vidět“ pre celú hlavnú stránku — ten istý film môže byť
// v úvode, Top 10, obľúbených aj naposledy prezeraných; všade má rovnaký stav.
type Ctx = { on: Record<string, boolean>; toggle: (movieId: string) => Promise<void> };
const WatchCtx = createContext<Ctx | null>(null);

function useWatchState(initial: Record<string, boolean>): Ctx {
  const [on, setOnState] = useState<Record<string, boolean>>(initial);
  const ref = useRef(on);
  const busy = useRef(new Set<string>());
  const set = (id: string, v: boolean) => {
    ref.current = { ...ref.current, [id]: v };
    setOnState(ref.current);
  };
  async function toggle(movieId: string) {
    if (busy.current.has(movieId)) return;
    busy.current.add(movieId);
    const was = !!ref.current[movieId];
    set(movieId, !was);
    try {
      const res = await fetch('/api/watchlist', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ movieId }) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error();
      set(movieId, !!d.inWatchlist);
    } catch {
      set(movieId, was);
    } finally {
      busy.current.delete(movieId);
    }
  }
  return { on, toggle };
}

export function HomeWatchlistProvider({ initial, children }: { initial: Record<string, boolean>; children: ReactNode }) {
  const value = useWatchState(initial);
  return createElement(WatchCtx.Provider, { value }, children);
}

// V rámci HomeWatchlistProvider zdieľaný stav, inak vlastný (samostatné použitie).
export function useWatchlist(initial: Record<string, boolean>): Ctx {
  const shared = useContext(WatchCtx);
  const own = useWatchState(initial);
  return shared || own;
}
