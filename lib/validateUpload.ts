// Base64 dátové URL obrázkov (avatar, plagát, fotka osoby...) nemajú na klientovi
// vynútený limit, ak niekto obíde formulár a volá API priamo. Táto kontrola je
// poistka na serveri — cca 3 MB dát ako base64 text (skutočný obrázok o niečo menej).
const MAX_BASE64_LENGTH = 4_000_000;

// Len skutočné bitmapové formáty — VEDOME vynechané "image/svg+xml": SVG je
// v skutočnosti XML súbor, čo môže obsahovať vložený <script> alebo
// "onload"/"onclick" handler. Ak by sa taký súbor niekedy otvoril priamo
// (nová karta, "zobraziť obrázok"), mohol by spustiť škodlivý kód —
// klasická, zdokumentovaná zraniteľnosť pri nahrávaní súborov.
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

export function validateImageDataUrl(value: unknown): string | null {
  if (!value) return null;
  if (typeof value !== 'string') return 'Neplatný formát obrázka.';
  if (!value.startsWith('data:image/')) return null; // externá URL a pod. — necháme prejsť

  const mimeMatch = value.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,([\s\S]+)$/);
  if (!mimeMatch || !ALLOWED_IMAGE_TYPES.includes(mimeMatch[1].toLowerCase())) {
    return 'Nepodporovaný formát obrázka — povolené sú len JPEG, PNG, GIF a WebP.';
  }

  if (value.length > MAX_BASE64_LENGTH) {
    return 'Obrázok je príliš veľký. Skús menší alebo viac skomprimovaný súbor.';
  }

  // Deklarovaný typ v "data:image/png;..." je len nálepka, čo si klient sám
  // napíše — nič nezaručuje, že skutočný obsah súboru tomu zodpovedá. Overíme
  // preto aj prvých pár bajtov skutočných dát (tzv. "magic number") — každý
  // bežný obrázkový formát má na začiatku charakteristickú, nemeniteľnú
  // sekvenciu bajtov. Toto zabráni napr. súboru, čo tvrdí, že je "image/png",
  // ale v skutočnosti obsahuje SVG/XML so škodlivým kódom.
  try {
    const buffer = Buffer.from(mimeMatch[2].slice(0, 16), 'base64');
    const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    const isPng = buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47;
    const isGif = buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46;
    const isWebp = buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46;
    if (!isJpeg && !isPng && !isGif && !isWebp) {
      return 'Súbor nevyzerá ako platný obrázok podporovaného formátu.';
    }
  } catch {
    return 'Súbor sa nepodarilo overiť ako platný obrázok.';
  }

  return null;
}

// Kontrola, že externý odkaz (napr. "Pozerať online") používa iba bezpečný protokol —
// zabráni napr. javascript:/data: odkazom, ktoré by mohli spustiť škodlivý kód pri kliknutí.
export function validateSafeUrl(value: unknown): string | null {
  if (!value) return null;
  if (typeof value !== 'string') return 'Neplatný formát odkazu.';
  const trimmed = value.trim();
  if (!/^https?:\/\//i.test(trimmed)) {
    return 'Odkaz musí začínať na http:// alebo https://.';
  }
  return null;
}
