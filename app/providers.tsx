'use client';

import { SessionProvider } from 'next-auth/react';
import { FilterFormStateProvider } from '@/components/FilterFormState';

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <FilterFormStateProvider>{children}</FilterFormStateProvider>
    </SessionProvider>
  );
}
