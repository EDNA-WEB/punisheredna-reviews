'use client';

import { useEffect } from 'react';

// Spracuje "?tv=1" / "?tv=0" v adrese — nastaví/zruší cookie a obnoví
// stránku, nech si ju server pri ďalšom vykreslení všimne (cookie sa počas
// tohto istého vykreslenia ešte prejaviť nemôže). Parameter sa potom z
// adresy odstráni, nech sa pri obnovení znova nespúšťa dokola.
export default function TvModeToggle() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tvParam = params.get('tv');
    if (tvParam !== '1' && tvParam !== '0') return;

    document.cookie = `tv-mode=${tvParam}; path=/; max-age=31536000`;

    params.delete('tv');
    const cleanQuery = params.toString();
    const newUrl = window.location.pathname + (cleanQuery ? `?${cleanQuery}` : '');
    window.location.href = newUrl;
  }, []);

  return null;
}
