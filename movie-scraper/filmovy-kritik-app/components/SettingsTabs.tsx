'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { href: '/nastavenia/ucet', label: 'Účet' },
  { href: '/nastavenia/clenstvo', label: '🎫 Členstvo' },
  { href: '/nastavenia/avatar', label: 'Avatar' },
  { href: '/nastavenia/zobrazenie', label: 'Zobrazenie' },
  { href: '/nastavenia/jazyky', label: 'Jazyky' },
  { href: '/nastavenia/notifikacie', label: 'Notifikácie' },
  { href: '/nastavenia/heslo', label: 'Zmena hesla' },
  { href: '/nastavenia/zariadenia', label: 'Prihlásené zariadenia' },
  { href: '/nastavenia/prepojenie', label: 'Prepojenie' }
];

export default function SettingsTabs() {
  const pathname = usePathname();

  return (
    <div className="flex items-center gap-0.5 mb-6 flex-wrap border-b border-line">
      {TABS.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`text-xs font-semibold px-2.5 py-2 border-b-2 -mb-px whitespace-nowrap transition-colors ${
              active ? 'text-ink border-accent' : 'text-muted border-transparent hover:text-ink'
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
