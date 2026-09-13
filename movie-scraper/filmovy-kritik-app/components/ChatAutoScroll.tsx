'use client';

import { useEffect, useRef } from 'react';

// Neviditeľný "kotviaci" prvok na konci zoznamu správ — pri každom vykreslení
// (nová správa, otvorenie konverzácie) sa naň plynulo posunie pohľad.
export default function ChatAutoScroll({ dep }: { dep: number }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ref.current?.scrollIntoView({ behavior: 'auto', block: 'end' });
  }, [dep]);

  return <div ref={ref} />;
}
