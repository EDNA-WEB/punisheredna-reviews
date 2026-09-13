'use client';

import { useState, useEffect } from 'react';
import { getChatTheme, setChatTheme } from '@/lib/chatTheme';

const BUBBLE_PRESETS = ['', '#E3141F', '#2563EB', '#059669', '#7C3AED', '#EA580C', '#DB2777'];

export default function ChatThemeCustomizer({ otherId, onClose }: { otherId: string; onClose: () => void }) {
  const [bubbleColor, setBubbleColor] = useState('');

  useEffect(() => {
    setBubbleColor(getChatTheme(otherId).bubbleColor);
  }, [otherId]);

  function save(color: string) {
    setChatTheme(otherId, { bubbleColor: color });
    window.dispatchEvent(new Event('chat-theme-changed'));
  }

  function reset() {
    setBubbleColor('');
    save('');
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-card border border-line rounded-xl p-5 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-display font-bold text-ink mb-1">Vzhľad konverzácie</h3>
        <p className="text-xs text-muted mb-4">
          Toto je len tvoje osobné nastavenie zobrazenia — vidíš ho len ty, na tomto zariadení. Druhá strana o ňom nevie.
        </p>

        <div className="mb-5">
          <div className="text-xs font-semibold text-ink mb-2">Farba tvojich bublín</div>
          <div className="flex flex-wrap gap-2">
            {BUBBLE_PRESETS.map((c) => (
              <button
                key={c || 'default'}
                type="button"
                onClick={() => {
                  setBubbleColor(c);
                  save(c);
                }}
                className={`w-8 h-8 rounded-full border-2 flex-none ${bubbleColor === c ? 'border-ink' : 'border-line'}`}
                style={{ backgroundColor: c || 'var(--color-ink)' }}
                title={c || 'Predvolená (podľa webu)'}
              />
            ))}
            <label className="w-8 h-8 rounded-full border-2 border-line flex-none flex items-center justify-center cursor-pointer text-[10px] text-muted overflow-hidden relative">
              +
              <input
                type="color"
                value={bubbleColor || '#E3141F'}
                onChange={(e) => {
                  setBubbleColor(e.target.value);
                  save(e.target.value);
                }}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
            </label>
          </div>
        </div>

        <div className="flex justify-between">
          <button type="button" onClick={reset} className="text-xs font-semibold text-muted hover:text-ink">
            Vrátiť predvolené
          </button>
          <button type="button" onClick={onClose} className="bg-accent text-white text-sm font-semibold px-5 py-2 rounded-full hover:bg-accent-dark">
            Hotovo
          </button>
        </div>
      </div>
    </div>
  );
}
