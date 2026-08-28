'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { signOut } from 'next-auth/react';
import { IconUser, IconMessage, IconHeartOutline, IconEye, IconNote, IconActivity, IconPlus, IconSettings } from './Icons';
import ThemeToggle from './ThemeToggle';
import { useT } from './TranslationProvider';
import { useNavDropdown } from './NavDropdownState';

export default function AvatarMenu({ userId, userName, userAvatar }: { userId: string; userName: string | null; userAvatar: string | null }) {
  const t = useT();
  const { openKey, setOpenKey } = useNavDropdown();
  const open = openKey === 'avatar';
  const setOpen = (v: boolean) => setOpenKey(v ? 'avatar' : null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  function openNow() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpen(true);
  }
  function closeSoon() {
    closeTimer.current = setTimeout(() => setOpen(false), 150);
  }

  return (
    <div ref={boxRef} onMouseEnter={openNow} onMouseLeave={closeSoon}>
      <button onClick={() => setOpen(!open)} className="flex items-center hover:opacity-90 transition-opacity" aria-label="Účet">
        {userAvatar ? (
          <img src={userAvatar} alt={userName || ''} className="w-9 h-9 rounded-full object-cover ring-2 ring-transparent hover:ring-accent transition-all" />
        ) : (
          <span className="w-9 h-9 rounded-full bg-surface flex items-center justify-center">
            <IconUser className="w-4 h-4 text-muted" />
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 pt-2 w-60 z-50">
          <div className="rounded-xl border border-line bg-card shadow-lg overflow-hidden">
            <div className="px-4 py-2.5 border-b border-line text-[11px] font-bold uppercase tracking-wide text-muted">
              {t('panel.nadpis')}
            </div>

            <Link
              href={`/profile/${userId}`}
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-3 border-b border-line hover:bg-surface"
            >
              {userAvatar ? (
                <img src={userAvatar} alt={userName || ''} className="w-9 h-9 rounded-full object-cover" />
              ) : (
                <span className="w-9 h-9 rounded-full bg-surface flex items-center justify-center">
                  <IconUser className="w-4 h-4 text-muted" />
                </span>
              )}
              <span className="font-display font-bold text-sm text-ink truncate">{userName}</span>
            </Link>

            <Link href="/messages" onClick={() => setOpen(false)} className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-ink hover:bg-surface">
              <IconMessage className="w-4 h-4 text-muted" />
              {t('panel.posta')}
            </Link>

            <Link href="/oblubeni" onClick={() => setOpen(false)} className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-ink hover:bg-surface">
              <IconHeartOutline className="w-4 h-4 text-muted" />
              {t('panel.oblubeni')}
            </Link>

            <Link href="/navstevnici" onClick={() => setOpen(false)} className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-ink hover:bg-surface">
              <IconEye className="w-4 h-4 text-muted" />
              {t('panel.navstevnici')}
            </Link>

            <Link href="/aktivita" onClick={() => setOpen(false)} className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-ink hover:bg-surface">
              <IconActivity className="w-4 h-4 text-muted" />
              {t('panel.aktivita')}
            </Link>

            <Link href="/poznamky" onClick={() => setOpen(false)} className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-ink hover:bg-surface">
              <IconNote className="w-4 h-4 text-muted" />
              {t('panel.poznamky')}
            </Link>

            <Link href="/nastavenia" onClick={() => setOpen(false)} className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-ink hover:bg-surface">
              <IconSettings className="w-4 h-4 text-muted" />
              {t('panel.nastavenia')}
            </Link>

            <ThemeToggle variant="menu" />

            <button
              onClick={() => signOut({ callbackUrl: '/' })}
              className="w-full text-left px-4 py-2.5 text-sm text-danger hover:bg-surface border-t border-line"
            >
              {t('panel.odhlasit')}
            </button>

            <Link
              href="/movie/pridat"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-accent font-semibold hover:bg-accent/5 border-t border-line"
            >
              <IconPlus className="w-4 h-4" />
              {t('panel.pridat_film')}
            </Link>

            <Link
              href="/osobnost/pridat"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-accent font-semibold hover:bg-accent/5"
            >
              <IconPlus className="w-4 h-4" />
              {t('panel.pridat_tvorcu')}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
