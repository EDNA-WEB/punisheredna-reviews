'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

// Bez websocketov: každých pár sekúnd sa (len na viditeľnej karte) opýta na
// "verziu" konverzácie — jeden malý dopyt. Celú stránku obnoví, až keď sa
// verzia zmení (nová správa, prečítanie). Pôvodne sa stránka prekresľovala
// stále dokola, čo stálo ~6 dopytov do databázy každé 4 sekundy.
export default function ChatPolling({ intervalMs = 5000, otherId }: { intervalMs?: number; otherId?: string }) {
  const router = useRouter();
  const version = useRef<string | null>(null);

  useEffect(() => {
    let alive = true;
    async function check() {
      if (document.visibilityState !== 'visible') return;
      if (!otherId) {
        router.refresh();
        return;
      }
      try {
        const res = await fetch(`/api/messages/check?otherId=${encodeURIComponent(otherId)}`, { cache: 'no-store' });
        const data = await res.json();
        if (!alive || !data.version) return;
        if (version.current !== null && version.current !== data.version) router.refresh();
        version.current = data.version;
      } catch {
        /* skúsi znova */
      }
    }
    check();
    const id = setInterval(check, otherId ? intervalMs : Math.max(intervalMs, 15000));
    function onVisible() {
      if (document.visibilityState === 'visible') check();
    }
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      alive = false;
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [router, intervalMs, otherId]);

  return null;
}
