'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { IconMessage, IconUser } from './Icons';
import { useT } from './TranslationProvider';
import { useNavDropdown } from './NavDropdownState';

type Convo = { userId: string; name: string; avatar: string | null; lastText: string; lastAt: string; unread: number };

export default function MessagesDropdown({ unreadTotal }: { unreadTotal: number }) {
  const t = useT();
  const { openKey, setOpenKey } = useNavDropdown();
  const open = openKey === 'messages';
  const setOpen = (v: boolean) => setOpenKey(v ? 'messages' : null);
  const [items, setItems] = useState<Convo[]>([]);
  const [loaded, setLoaded] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  async function handleOpen() {
    const next = !open;
    setOpen(next);
    if (next && !loaded) {
      try {
        const res = await fetch('/api/messages/recent');
        if (res.ok) setItems(await res.json());
      } catch {}
      setLoaded(true);
    }
  }

  return (
    <div ref={boxRef}>
      <button
        onClick={handleOpen}
        className={`relative w-10 h-10 flex items-center justify-center rounded-full transition-colors duration-200 ${
          open ? 'text-accent bg-accent/10' : 'text-ink hover:text-accent hover:bg-surface'
        }`}
        aria-label={t('spravy.aria_label')}
      >
        <IconMessage className="w-[22px] h-[22px]" filled={open} />
        {unreadTotal > 0 && (
          <span className="absolute top-0.5 right-0.5 w-4 h-4 bg-danger text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unreadTotal > 9 ? '9+' : unreadTotal}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 max-h-[26rem] overflow-y-auto rounded-xl border border-line bg-card shadow-lg z-50">
          <div className="px-4 py-3 border-b border-line font-display font-bold text-sm text-ink">{t('spravy.nadpis')}</div>
          {!loaded ? (
            <div className="px-4 py-4 text-sm text-muted">{t('spravy.nacitavam')}</div>
          ) : items.length === 0 ? (
            <div className="px-4 py-4 text-sm text-muted">{t('spravy.prazdne')}</div>
          ) : (
            items.slice(0, 5).map((c) => (
              <Link
                key={c.userId}
                href={`/messages/${c.userId}`}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 border-b border-line last:border-b-0 hover:bg-surface ${c.unread > 0 ? 'bg-accent/5' : ''}`}
              >
                {c.avatar ? (
                  <img src={c.avatar} alt={c.name} className="w-9 h-9 rounded-full object-cover flex-none" />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-surface flex items-center justify-center flex-none">
                    <IconUser className="w-4 h-4 text-muted" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-ink truncate">{c.name}</span>
                    <span className="text-[10px] text-muted flex-none">{new Date(c.lastAt).toLocaleDateString('sk-SK')}</span>
                  </div>
                  <p className="text-xs text-muted truncate">{c.lastText}</p>
                </div>
                {c.unread > 0 && <span className="w-2 h-2 rounded-full bg-accent flex-none" />}
              </Link>
            ))
          )}
          <Link
            href="/messages"
            onClick={() => setOpen(false)}
            className="block text-center text-xs font-semibold text-accent py-3 border-t border-line hover:bg-surface"
          >
            {t('spravy.viac')}
          </Link>
        </div>
      )}
    </div>
  );
}
