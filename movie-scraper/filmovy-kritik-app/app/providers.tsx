'use client';

import { SessionProvider } from 'next-auth/react';
import { FilterFormStateProvider } from '@/components/FilterFormState';
import { NavDropdownProvider } from '@/components/NavDropdownState';

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <FilterFormStateProvider>
        <NavDropdownProvider>{children}</NavDropdownProvider>
      </FilterFormStateProvider>
    </SessionProvider>
  );
}
