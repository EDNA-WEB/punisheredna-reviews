'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Bez živého pripojenia (websockety) je toto najjednoduchší spoľahlivý spôsob,
// ako aktualizovať fajočky "prečítané" a nové správy bez toho, aby musel
// používateľ ručne obnoviť stránku — na pozadí sa dáta potichu dotiahnu znova.
export default function ChatPolling({ intervalMs = 4000 }: { intervalMs?: number }) {
  const router = useRouter();

  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') {
        router.refresh();
      }
    }, intervalMs);
    return () => clearInterval(id);
  }, [router, intervalMs]);

  return null;
}
