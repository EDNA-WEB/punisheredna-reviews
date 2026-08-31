'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { IconBell } from './Icons';
import { useT } from './TranslationProvider';
import { useNavDropdown } from './NavDropdownState';

type Notif = { id: string; text: string; link: string; read: boolean; createdAt: string };

export default function NotificationsBell() {
  const t = useT();
  const { openKey, setOpenKey } = useNavDropdown();
  const open = openKey === 'notifications';
  const setOpen = (v: boolean) => setOpenKey(v ? 'notifications' : null);
  const [items, setItems] = useState<Notif[]>([]);
  const [loaded, setLoaded] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  const unread = items.filter((i) => !i.read).length;

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  async function load() {
    try {
      const res = await fetch('/api/notifications');
      if (res.ok) setItems(await res.json());
    } catch {}
    setLoaded(true);
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, []);

  async function handleOpen() {
    const next = !open;
    setOpen(next);
    if (next && unread > 0) {
      await fetch('/api/notifications', { method: 'PATCH' });
      setItems((prev) => prev.map((i) => ({ ...i, read: true })));
    }
  }

  return (
    <div ref={boxRef}>
      <button
        onClick={handleOpen}
        className={`relative w-10 h-10 flex items-center justify-center rounded-full transition-colors duration-200 ${
          open ? 'text-accent bg-accent/10' : 'text-ink hover:text-accent hover:bg-surface'
        }`}
        aria-label={t('notif.aria_label')}
      >
        <IconBell className="w-[22px] h-[22px]" filled={open} />
        {unread > 0 && (
          <span className="absolute top-0.5 right-0.5 w-4 h-4 bg-danger text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto rounded-xl border border-line bg-card shadow-lg z-50">
          <div className="px-4 py-3 border-b border-line font-display font-bold text-sm text-ink">{t('notif.nadpis')}</div>
          {!loaded ? (
            <div className="px-4 py-4 text-sm text-muted">{t('notif.nacitavam')}</div>
          ) : items.length === 0 ? (
            <div className="px-4 py-4 text-sm text-muted">{t('notif.prazdne')}</div>
          ) : (
            items.slice(0, 5).map((n) => (
              <Link
                key={n.id}
                href={n.link}
                onClick={() => setOpen(false)}
                className={`block px-4 py-3 text-sm border-b border-line last:border-b-0 hover:bg-surface ${!n.read ? 'bg-orange-50' : ''}`}
              >
                <div className="text-ink">{n.text}</div>
                <div className="text-xs text-muted mt-1">{new Date(n.createdAt).toLocaleString('sk-SK')}</div>
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  );
}
