'use client';

import { usePathname } from 'next/navigation';

// Skryje obsah (napr. cookie lištu) na zdieľanom článku.
export default function HideOnShared({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || '';
  if (pathname.startsWith('/sdilet/')) return null;
  return <>{children}</>;
}
