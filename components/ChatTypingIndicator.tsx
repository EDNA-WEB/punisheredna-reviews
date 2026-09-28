'use client';

import { useEffect, useState } from 'react';
import { useT } from './TranslationProvider';

// Bublina s tromi poskakujúcimi bodkami, keď druhá strana práve píše
// (ako WhatsApp). Kontroluje každé ~2 s, len keď je karta viditeľná.
export default function ChatTypingIndicator({ otherId }: { otherId: string }) {
  const t = useT();
  const [typing, setTyping] = useState(false);

  useEffect(() => {
    let alive = true;
    async function check() {
      if (document.visibilityState !== 'visible') return;
      try {
        const res = await fetch(`/api/messages/typing?otherId=${encodeURIComponent(otherId)}`, { cache: 'no-store' });
        const data = await res.json();
        if (alive) setTyping(!!data.typing);
      } catch {
        /* ignoruj — indikátor je len doplnok */
      }
    }
    check();
    const id = setInterval(check, 2000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [otherId]);

  if (!typing) return null;

  return (
    <div className="flex items-end gap-2 px-1 pt-1" aria-live="polite" aria-label={t('spravy.pise')}>
      <div className="bg-card border border-line rounded-2xl rounded-bl-md px-3.5 py-2.5 flex items-center gap-1 shadow-sm">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-muted inline-block animate-bounce"
            style={{ animationDelay: `${i * 0.15}s`, animationDuration: '1s' }}
          />
        ))}
      </div>
      <span className="text-xs text-muted mb-1">{t('spravy.pise')}</span>
    </div>
  );
}
