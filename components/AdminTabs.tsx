'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { IconChevronDown } from './Icons';

const PROFILE_GROUP = {
  label: 'Profil filmu',
  items: [
    { href: '/admin/premieres', label: 'Premiéry' },
    { href: '/admin/tagy', label: 'Tagy' },
    { href: '/admin/online', label: 'Online' },
    { href: '/admin/kde-sledovat', label: 'Kde sledovať' },
    { href: '/admin/odkazy', label: 'Odkazy' },
    { href: '/admin/lokalizacia', label: 'Lokalizácia' },
    { href: '/admin/zaujimavosti', label: 'Zaujímavosti' }
  ]
};

const TABS = [
  { href: '/admin', label: 'Recenzie' },
  { href: '/admin/movies', label: 'Filmy' },
  { href: '/admin/people', label: 'Osobnosti' },
  { href: '/admin/news', label: 'Novinky' },
  { href: '/admin/trailers', label: 'Trailery' },
  { href: '/admin/upozornenia', label: 'Upozornenia' },
  { href: '/admin/nahlasenia', label: 'Nahlásenia' },
  { href: '/admin/obchod/produkty', label: 'Obchod' },
  { href: '/admin/navrhy-obsahu', label: 'Návrhy obsahu' },
  { href: '/admin/clenstvo', label: '🎫 Členstvo' },
  { href: '/admin/audit-log', label: 'Audit log' },
  { href: '/admin/analytics', label: 'Analytics' },
  { href: '/admin/users', label: 'Čitatelia' },
  { href: '/admin/settings', label: 'Vzhľad' },
  { href: '/admin/preklad', label: 'Preklad' },
  { href: '/admin/system', label: 'Systém' }
];

export default function AdminTabs() {
  const pathname = usePathname();
  const [groupOpen, setGroupOpen] = useState(false);
  const groupRef = useRef<HTMLDivElement>(null);

  const groupIsActive = PROFILE_GROUP.items.some((i) => pathname.startsWith(i.href));

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (groupRef.current && !groupRef.current.contains(e.target as Node)) setGroupOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  return (
    <div className="flex items-center gap-1.5 mb-8 flex-wrap border-b border-line pb-4">
      <div ref={groupRef} className="relative">
        <button
          type="button"
          onClick={() => setGroupOpen((v) => !v)}
          className={`flex items-center gap-1 text-xs font-semibold px-3.5 py-1.5 rounded-full transition-colors ${
            groupIsActive ? 'bg-accent text-white' : 'text-muted bg-surface hover:text-ink'
          }`}
        >
          {PROFILE_GROUP.label}
          <IconChevronDown className={`w-3.5 h-3.5 transition-transform ${groupOpen ? 'rotate-180' : ''}`} />
        </button>

        {groupOpen && (
          <div className="absolute z-30 mt-2 w-48 bg-card border border-line rounded-xl shadow-lg py-1.5">
            {PROFILE_GROUP.items.map((item) => {
              const active = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setGroupOpen(false)}
                  className={`block px-4 py-2 text-sm transition-colors ${
                    active ? 'font-bold text-accent' : 'text-ink hover:bg-surface'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {TABS.map((t) => {
        const active = t.href === '/admin' ? pathname === '/admin' : pathname.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`text-xs font-semibold px-3.5 py-1.5 rounded-full transition-colors ${
              active ? 'bg-accent text-white' : 'text-muted bg-surface hover:text-ink'
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}
