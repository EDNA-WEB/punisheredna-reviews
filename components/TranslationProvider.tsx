'use client';

import { createContext, useContext } from 'react';

const TranslationContext = createContext<Record<string, string>>({});

export function TranslationProvider({ dict, children }: { dict: Record<string, string>; children: React.ReactNode }) {
  return <TranslationContext.Provider value={dict}>{children}</TranslationContext.Provider>;
}

export function useT() {
  const dict = useContext(TranslationContext);
  return (key: string, fallback?: string) => dict[key] || fallback || key;
}
