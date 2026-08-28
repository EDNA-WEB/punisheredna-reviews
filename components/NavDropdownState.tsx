'use client';

import { createContext, useContext, useState } from 'react';

// Zdieľaný stav medzi všetkými rozbaľovacími menu v navbare (pošta,
// notifikácie, chcem vidieť, profil) — v danej chvíli smie byť otvorené
// len JEDNO z nich. Otvorenie nového automaticky zavrie predošlé.
const NavDropdownContext = createContext<{ openKey: string | null; setOpenKey: (k: string | null) => void }>({
  openKey: null,
  setOpenKey: () => {}
});

export function NavDropdownProvider({ children }: { children: React.ReactNode }) {
  const [openKey, setOpenKey] = useState<string | null>(null);
  return <NavDropdownContext.Provider value={{ openKey, setOpenKey }}>{children}</NavDropdownContext.Provider>;
}

export function useNavDropdown() {
  return useContext(NavDropdownContext);
}
