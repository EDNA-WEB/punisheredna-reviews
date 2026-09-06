'use client';

import { useState, useEffect } from 'react';
import { getChatTheme } from '@/lib/chatTheme';

export default function ChatThemeWrapper({ otherId, children }: { otherId: string; children: React.ReactNode }) {
  const [bg, setBg] = useState('');

  useEffect(() => {
    setBg(getChatTheme(otherId).backgroundColor);
    function onStorage() {
      setBg(getChatTheme(otherId).backgroundColor);
    }
    window.addEventListener('storage', onStorage);
    window.addEventListener('chat-theme-changed', onStorage);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('chat-theme-changed', onStorage);
    };
  }, [otherId]);

  return (
    <div
      className="flex-1 overflow-y-auto py-5 space-y-1"
      style={{
        backgroundColor: bg || undefined,
        backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(128,128,128,0.18) 1px, transparent 0)',
        backgroundSize: '18px 18px'
      }}
    >
      {children}
    </div>
  );
}
