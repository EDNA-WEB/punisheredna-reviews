'use client';

import { useEffect } from 'react';

// Spracuje "?theme=steam" / "?theme=default" v adrese — nastaví/zruší
// cookie a obnoví stránku, nech si to server pri ďalšom vykreslení všimne.
// Nezávislé od bežného tmavého/svetlého prepínača (iná cookie) — umožňuje
// otestovať novú Steam paletu bez toho, aby to ovplyvnilo ostatných
// návštevníkov (ktorí "themeVariant" cookie vôbec nemajú).
export default function ThemeVariantToggle() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const themeParam = params.get('theme');
    if (themeParam !== 'steam' && themeParam !== 'default') return;

    document.cookie = `themeVariant=${themeParam}; path=/; max-age=31536000`;

    params.delete('theme');
    const cleanQuery = params.toString();
    const newUrl = window.location.pathname + (cleanQuery ? `?${cleanQuery}` : '');
    window.location.href = newUrl;
  }, []);

  return null;
}
