'use client';

import { useEffect, useState } from 'react';

// Fotka z chatu na celú obrazovku (web). Klik na fotku = priblíženie 2×,
// Esc / klik vedľa = zavrieť. Fotka je dostupná 24 h od odoslania.
export default function ChatPhotoLightbox({ src, onClose }: { src: string; onClose: () => void }) {
  const [zoom, setZoom] = useState(false);
  const [origin, setOrigin] = useState('50% 50%');

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[100] bg-black/90 flex flex-col" onClick={onClose} role="dialog" aria-modal="true">
      <div className="flex items-center justify-end gap-2 p-3" onClick={(e) => e.stopPropagation()}>
        <a
          href={src}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-semibold text-white/90 hover:text-white bg-white/10 hover:bg-white/20 rounded-full px-4 py-1.5"
        >
          Otevřít v prohlížeči
        </a>
        <button
          type="button"
          onClick={onClose}
          className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center"
          aria-label="Zavřít"
        >
          ✕
        </button>
      </div>
      <div className="flex-1 overflow-hidden flex items-center justify-center p-4">
        <img
          src={src}
          alt="Fotka"
          onClick={(e) => {
            e.stopPropagation();
            const r = e.currentTarget.getBoundingClientRect();
            setOrigin(`${((e.clientX - r.left) / r.width) * 100}% ${((e.clientY - r.top) / r.height) * 100}%`);
            setZoom((z) => !z);
          }}
          className={`max-w-full max-h-full object-contain select-none transition-transform duration-200 ${zoom ? 'cursor-zoom-out' : 'cursor-zoom-in'}`}
          style={{ transform: zoom ? 'scale(2.2)' : 'scale(1)', transformOrigin: origin }}
          draggable={false}
        />
      </div>
    </div>
  );
}
