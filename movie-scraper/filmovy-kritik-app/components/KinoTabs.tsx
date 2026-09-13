'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useT } from './TranslationProvider';

export default function KinoTabs() {
  const pathname = usePathname();
  const t = useT();

  const tabs = [
    { href: '/kino', label: t('kino.tab_kino_premiery') },
    { href: '/kino/rocny-prehlad', label: t('kino.tab_rocny_prehlad') }
  ];

  return (
    <div className="flex border-b border-line mb-6">
      {tabs.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors ${
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
