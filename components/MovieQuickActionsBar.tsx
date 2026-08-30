'use client';

import { useState, useRef, useEffect } from 'react';
import { IconEdit, IconBookmark, IconHeartOutline, IconList, IconLayers } from './Icons';

const MORE_ITEMS = [
  'Upravit recenzi',
  'Přidat do Chci vidět',
  'Přidat do oblíbených',
  'Přidat do seznamů',
  'Přidat do filmotéky',
  'Přidat obsah',
  'Přidat zajímavost',
  'Přidat obrázky',
  'Přidat podobné filmy',
  'Přidat související filmy',
  'Přidat externí recenzi',
  'Přidat tagy',
  'Přidat web'
];

export default function MovieQuickActionsBar() {
  const [moreOpen, setMoreOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!moreOpen) return;
    function onClickOutside(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setMoreOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [moreOpen]);

  const primaryButtonClass =
    'flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-full bg-accent text-white hover:bg-accent-dark transition-colors flex-none whitespace-nowrap';
  const secondaryButtonClass =
    'flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-full border border-line text-ink hover:bg-surface transition-colors flex-none whitespace-nowrap';

  return (
    <div className="flex items-center gap-2 pt-4 mt-4 border-t border-line overflow-x-auto">
      <button className={primaryButtonClass}>
        <IconEdit className="w-3.5 h-3.5" />
        Upravit recenzi
      </button>

      <button className={`${secondaryButtonClass} hidden sm:flex`}>
        <IconBookmark className="w-3.5 h-3.5 text-blue-500" />
        Chci vidět
      </button>
      <button className={`${secondaryButtonClass} hidden sm:flex`}>
        <IconHeartOutline className="w-3.5 h-3.5 text-rose-500" />
        Oblíbené
      </button>
      <button className={`${secondaryButtonClass} hidden sm:flex`}>
        <IconList className="w-3.5 h-3.5 text-amber-500" />
        Seznamy
      </button>
      <button className={`${secondaryButtonClass} hidden sm:flex`}>
        <IconLayers className="w-3.5 h-3.5 text-emerald-500" />
        Filmotéka
      </button>

      <button className={`${secondaryButtonClass} sm:hidden`}>
        <IconBookmark className="w-3.5 h-3.5 text-blue-500" />
        Chci vidět
      </button>
      <button className={`${secondaryButtonClass} sm:hidden`}>
        <IconHeartOutline className="w-3.5 h-3.5 text-rose-500" />
        Oblíbené
      </button>

      <div className="relative flex-none" ref={boxRef}>
        <button
          onClick={() => setMoreOpen((o) => !o)}
          className="flex items-center justify-center w-8 h-8 rounded-full border border-line text-ink hover:bg-surface transition-colors flex-none"
          aria-label="Ďalšie možnosti"
        >
          •••
        </button>
        {moreOpen && (
          <div className="absolute right-0 top-full mt-1 w-56 rounded-xl border border-line bg-card shadow-lg overflow-hidden z-20 max-h-80 overflow-y-auto">
            {MORE_ITEMS.map((label) => (
              <button
                key={label}
                onClick={() => setMoreOpen(false)}
                className="w-full text-left px-4 py-2.5 text-sm text-ink hover:bg-surface"
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
