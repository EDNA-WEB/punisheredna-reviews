// Base64 dátové URL obrázkov (avatar, plagát, fotka osoby...) nemajú na klientovi
// vynútený limit, ak niekto obíde formulár a volá API priamo. Táto kontrola je
// poistka na serveri — cca 3 MB dát ako base64 text (skutočný obrázok o niečo menej).
const MAX_BASE64_LENGTH = 4_000_000;

export function validateImageDataUrl(value: unknown): string | null {
  if (!value) return null;
  if (typeof value !== 'string') return 'Neplatný formát obrázka.';
  if (!value.startsWith('data:image/')) return null; // externá URL a pod. — necháme prejsť
  if (value.length > MAX_BASE64_LENGTH) {
    return 'Obrázok je príliš veľký. Skús menší alebo viac skomprimovaný súbor.';
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
