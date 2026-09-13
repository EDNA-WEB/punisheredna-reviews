'use client';

import { createContext, useContext, useState } from 'react';

// Zdieľaný stav medzi tlačidlom filtra v navbare a samotným formulárom na
// /recenzie/filter — tlačidlo takto vie, či je formulár prázdny alebo
// vyplnený, aj keď sedia na dvoch rôznych stránkach/komponentoch.
const FilterFormStateContext = createContext<{ hasInput: boolean; setHasInput: (v: boolean) => void }>({
  hasInput: false,
  setHasInput: () => {}
});

export function FilterFormStateProvider({ children }: { children: React.ReactNode }) {
  const [hasInput, setHasInput] = useState(false);
  return (
    <FilterFormStateContext.Provider value={{ hasInput, setHasInput }}>
      {children}
    </FilterFormStateContext.Provider>
  );
}

export function useFilterFormState() {
  return useContext(FilterFormStateContext);
}
