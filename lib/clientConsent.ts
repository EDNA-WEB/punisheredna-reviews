'use client';

// Klientská obdoba isConsentGranted — na čítanie cookie priamo v prehliadači,
// tam kde nemáme prístup k next/headers (napr. tlačidlo prepínania témy).
export function hasClientConsent(key: string): boolean {
  if (typeof document === 'undefined') return true;
  const match = document.cookie.match(/(?:^|; )privacy_consent=([^;]*)/);
  if (!match) return true; // súhlas sa ešte nerozhodoval -> pôvodné správanie
  try {
    const consent = JSON.parse(decodeURIComponent(match[1]));
    if (!(key in consent)) return true;
    return consent[key] !== false;
  } catch {
    return true;
  }
}
