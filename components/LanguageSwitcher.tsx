'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useT } from './TranslationProvider';
import { IconGlobe } from './Icons';

const LANGUAGES = [
  { code: 'sk', label: 'Slovenčina' },
  { code: 'en', label: 'English' },
  { code: 'cs', label: 'Čeština' }
];

export default function LanguageSwitcher() {
  const router = useRouter();
  const t = useT();
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  function openNow() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpen(true);
  }
  function closeSoon() {
    closeTimer.current = setTimeout(() => setOpen(false), 150);
  }

  function choose(code: string) {
    // Bez max-age -> session cookie, zmizne pri zatvorení prehliadača.
    document.cookie = `lang=${code}; path=/; SameSite=Lax`;
    setOpen(false);
    router.refresh();
  }

  return (
    <div ref={boxRef} className="relative" onMouseEnter={openNow} onMouseLeave={closeSoon}>
      <button
        onClick={() => setOpen((o) => !o)}
        title={t('auth.jazyk_webu')}
        aria-label={t('auth.jazyk_webu')}
        className="flex items-center justify-center w-9 h-9 rounded-full text-muted hover:bg-surface hover:text-ink transition-colors"
      >
        <IconGlobe className="w-[19px] h-[19px]" />
      </button>

      {open && (
        <div className="absolute right-0 pt-2 w-36 z-50">
          <div className="rounded-xl border border-line bg-card shadow-lg overflow-hidden">
            {LANGUAGES.map((l) => (
              <button
                key={l.code}
                onClick={() => choose(l.code)}
                className="w-full text-left px-3.5 py-2 text-xs text-ink hover:bg-surface"
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
