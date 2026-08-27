'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { IconUser } from './Icons';
import { useT } from './TranslationProvider';

export default function AccountMenu() {
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

  return (
    <div ref={boxRef} className="relative" onMouseEnter={openNow} onMouseLeave={closeSoon}>
      <button
        onClick={() => setOpen((o) => !o)}
        title={t('auth.moj_ucet')}
        aria-label={t('auth.moj_ucet')}
        className="flex items-center justify-center w-9 h-9 rounded-full text-muted hover:bg-surface hover:text-ink transition-colors"
      >
        <IconUser className="w-[19px] h-[19px]" />
      </button>

      {open && (
        <div className="absolute right-0 pt-2 w-56 z-50">
          <div className="rounded-xl border border-line bg-card shadow-lg overflow-hidden">
            <div className="px-4 py-2.5 border-b border-line text-[11px] font-bold uppercase tracking-wide text-muted">
              {t('auth.moj_ucet')}
            </div>

            <Link href="/login" onClick={() => setOpen(false)} className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-ink hover:bg-surface">
              {t('auth.prihlasit')}
            </Link>
            <Link href="/register" onClick={() => setOpen(false)} className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-ink hover:bg-surface border-t border-line">
              {t('auth.registracia')}
            </Link>
            <Link href="/zabudnute-heslo" onClick={() => setOpen(false)} className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-muted hover:bg-surface hover:text-ink border-t border-line">
              {t('auth.zabudnute_heslo')}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
