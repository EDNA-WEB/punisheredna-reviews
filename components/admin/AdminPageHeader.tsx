'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ADMIN_NAV, isNavActive } from './adminNav';

// Jednotná hlavička každej stránky administrácie (rovnaký štýl ako dashboard):
// navigačná cesta (Administrace › Obsah › Filmy a seriály) → nadpis → popis
// → akcie vpravo. compact = hlavička je vnútri riadku s vlastnými tlačidlami.
export default function AdminPageHeader({
  title,
  description,
  actions,
  compact
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  compact?: boolean;
}) {
  const pathname = usePathname() || '/admin';
  let group: string | null = null;
  let item: { href: string; label: string } | null = null;
  for (const g of ADMIN_NAV) {
    for (const it of g.items) {
      if (it.href !== '/admin' && isNavActive(it, pathname) && (!item || it.href.length > item.href.length)) {
        group = g.label;
        item = it;
      }
    }
  }
  const deeper = !!item && pathname !== item.href;

  return (
    <header className={`admin-page-header ${compact ? '' : 'mb-6'}`}>
      <nav className="flex items-center flex-wrap gap-1.5 text-[12.5px] text-muted mb-1.5" aria-label="Navigace">
        <Link href="/admin" className="hover:text-ink">
          Administrace
        </Link>
        {group && (
          <>
            <span aria-hidden>›</span>
            <span>{group}</span>
          </>
        )}
        {item && (
          <>
            <span aria-hidden>›</span>
            {deeper ? (
              <Link href={item.href} className="hover:text-ink">
                {item.label}
              </Link>
            ) : (
              <span className="text-ink font-medium">{item.label}</span>
            )}
          </>
        )}
      </nav>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-display font-extrabold text-[26px] sm:text-[28px] leading-tight text-ink">{title}</h1>
          {description && <p className="text-[14px] text-muted mt-1.5 max-w-3xl leading-relaxed">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
    </header>
  );
}
