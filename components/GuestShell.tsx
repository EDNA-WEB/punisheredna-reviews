'use client';

import { usePathname } from 'next/navigation';

// Obálka pre NEprihláseného: prihlasovací formulár v strede + tapeta + počet
// filmov. Na zdieľanom článku (/sdilet/…) sa nezobrazí nič z toho — len článok.
export default function GuestShell({ wallpaper, count, children }: { wallpaper: React.ReactNode; count: React.ReactNode; children: React.ReactNode }) {
  const pathname = usePathname() || '';
  if (pathname.startsWith('/sdilet/')) return <>{children}</>;
  return (
    <>
      {wallpaper}
      <main className="min-h-screen flex flex-col justify-center max-w-lg mx-auto px-5">
        {children}
        {count}
      </main>
    </>
  );
}
