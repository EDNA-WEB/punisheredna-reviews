'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { IconChevronDown } from './Icons';

export default function GenreDropdown({ genres, activeGenre, allLabel }: { genres: string[]; activeGenre: string | null; allLabel: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative flex-none">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 bg-card border border-line rounded-xl px-4 py-2.5 text-sm font-semibold text-ink hover:border-accent transition-colors"
      >
        {activeGenre || allLabel}
        <IconChevronDown className={`w-4 h-4 text-muted transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute z-30 mt-2 w-56 max-h-80 overflow-y-auto bg-card border border-line rounded-xl shadow-lg py-1.5">
          <Link
            href="/recenzie"
            onClick={() => setOpen(false)}
            className={`block px-4 py-2 text-sm hover:bg-surface transition-colors ${!activeGenre ? 'font-bold text-accent' : 'text-ink'}`}
          >
            {allLabel}
          </Link>
          {genres.map((g) => (
            <Link
              key={g}
              href={`/recenzie?genre=${encodeURIComponent(g)}`}
              onClick={() => setOpen(false)}
              className={`block px-4 py-2 text-sm hover:bg-surface transition-colors ${activeGenre === g ? 'font-bold text-accent' : 'text-ink'}`}
            >
              {g}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
