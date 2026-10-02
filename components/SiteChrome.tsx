'use client';

import { usePathname } from 'next/navigation';

// Verejná "obálka" webu (tapeta, horná lišta, menu, štatistiky, pätička).
// V administrácii sa NEzobrazuje — tá má vlastné rozhranie (app/admin/layout.tsx).
// Rozhoduje sa v prehliadači podľa aktuálnej adresy, pretože hlavný layout sa
// pri prechode medzi stránkami znova nevykresľuje (pri príchode z hlavnej
// stránky do administrácie by inak obálka ostala).
export default function SiteChrome({ top, footer, children }: { top: React.ReactNode; footer: React.ReactNode; children: React.ReactNode }) {
  const pathname = usePathname() || '';
  if (pathname === '/admin' || pathname.startsWith('/admin/')) return <>{children}</>;
  // Zdieľaný článok — bez akýchkoľvek prvkov webu
  if (pathname.startsWith('/sdilet/')) return <>{children}</>;
  return (
    <>
      {top}
      <div className="main-content-shell max-w-6xl mx-auto px-5 sm:px-6 pb-20 bg-bg sm:shadow-[0_0_40px_rgba(0,0,0,0.06)] min-h-screen">
        {children}
        {footer}
      </div>
    </>
  );
}
