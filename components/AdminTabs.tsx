'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { href: '/admin', label: 'Recenzie' },
  { href: '/admin/movies', label: 'Filmy' },
  { href: '/admin/people', label: 'Osobnosti' },
  { href: '/admin/premieres', label: 'Premiéry' },
  { href: '/admin/news', label: 'Novinky' },
  { href: '/admin/trailers', label: 'Trailery' },
  { href: '/admin/online', label: 'Online' },
  { href: '/admin/kde-sledovat', label: 'Kde sledovať' },
  { href: '/admin/odkazy', label: 'Odkazy' },
  { href: '/admin/navrhy-obsahu', label: 'Návrhy obsahu' },
  { href: '/admin/clenstvo', label: '🎫 Členstvo' },
  { href: '/admin/lokalizacia', label: 'Lokalizácia' },
  { href: '/admin/audit-log', label: 'Audit log' },
  { href: '/admin/analytics', label: 'Analytics' },
  { href: '/admin/users', label: 'Čitatelia' },
  { href: '/admin/settings', label: 'Vzhľad' },
  { href: '/admin/preklad', label: 'Preklad' },
  { href: '/admin/system', label: 'Systém' }
];

export default function AdminTabs() {
  const pathname = usePathname();

  return (
    <div className="flex items-center gap-1.5 mb-8 flex-wrap border-b border-line pb-4">
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
