import { cookies, headers } from 'next/headers';

// Rozpoznanie Smart TV zariadení podľa User-Agent — pokrýva bežné platformy
// (Samsung Tizen, LG webOS, Android TV/Google TV, Amazon Fire TV, Chromecast,
// HbbTV vstavané do televízorov, Sony Bravia, Roku, PlayStation/Xbox prehliadače).
function isSmartTvUserAgent(ua: string): boolean {
  return /tizen|webos|smart-tv|smarttv|googletv|appletv|hbbtv|netcast|viera|aftb|aftt|aftm|firetv|crkey|roku|bravia|philipstv|playstation|xbox/i.test(
    ua
  );
}

// Rozpoznávanie podľa User-Agent nie je vždy spoľahlivé — niektoré (najmä
// lacnejšie/generické) Smart TV prehliadače sa hlásia úplne bežným reťazcom.
// Preto okrem automatického rozpoznania funguje aj MANUÁLNE vynútenie: adresa
// s "?tv=1" na konci TV režim zapne a zapamätá (cookie na 1 rok, nastaví ju
// TvModeToggle.tsx), "?tv=0" ho naopak vypne.
//
// Použi túto funkciu z KTORÉHOKOĽVEK server komponentu (nielen z layout.tsx),
// keď potrebuješ vedieť, či ide o TV, napr. aby si vynechal "target=_blank"
// odkazy (na TV nefunguje spoľahlivo prepínanie kariet).
export function detectTvMode(): boolean {
  const tvCookie = cookies().get('tv-mode')?.value;
  if (tvCookie === '1') return true;
  if (tvCookie === '0') return false;
  return isSmartTvUserAgent(headers().get('user-agent') || '');
}
