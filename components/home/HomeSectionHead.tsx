import Link from 'next/link';
import type { ReactNode } from 'react';
import { HIcon } from './HomeIcons';

// Nadpis sekcie hlavnej stránky: červená ikonka, nadpis, podnadpis,
// voliteľné prepínanie (children) a odkaz „Zobrazit vše“.
export default function HomeSectionHead({
  icon,
  title,
  sub,
  href,
  moreLabel,
  dark = false,
  children
}: {
  icon: string;
  title: string;
  sub?: ReactNode;
  href?: string;
  moreLabel?: string;
  dark?: boolean;
  children?: ReactNode;
}) {
  return (
    <div className="flex items-center flex-wrap gap-y-3 gap-x-4 mb-5 min-w-0">
      <div className="flex items-center min-w-0 flex-1 sm:flex-none">
        <span className={`hp-hicon ${dark ? '!bg-white/10 !text-white' : ''}`}>
          <HIcon name={icon} />
        </span>
        <div className="min-w-0 ml-3">
          <h2 className={`font-display font-extrabold text-[21px] sm:text-[25px] tracking-[-0.02em] leading-tight ${dark ? 'text-white' : 'text-ink'}`}>{title}</h2>
          {sub ? <p className={`text-[13px] ${dark ? 'text-white/60' : 'text-muted'}`}>{sub}</p> : null}
        </div>
      </div>
      {children ? <div className="order-last w-full sm:order-none sm:w-auto min-w-0">{children}</div> : null}
      {href && moreLabel && (
        <Link href={href} className={`ml-auto hp-more ${dark ? '!text-white/70 hover:!text-white' : ''}`}>
          {moreLabel} &rarr;
        </Link>
      )}
    </div>
  );
}
