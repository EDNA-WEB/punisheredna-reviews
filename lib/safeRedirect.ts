// Povolí presmerovanie LEN na cestu v rámci tohto webu ("/movie/abc").
// Blokuje "//evil.com", "/\\evil.com" (prehliadač spätnú lomku berie ako lomku),
// "https://…", "javascript:…" aj riadiace znaky. Inak vráti null.
export function safeLocalPath(value: unknown): string | null {
  if (typeof value !== 'string' || value.length === 0 || value.length > 2000) return null;
  if (!value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return null;
  if (/[\u0000-\u001F\u007F]/.test(value)) return null;
  try {
    const base = 'https://kontrola.invalid';
    const url = new URL(value, base);
    if (url.origin !== base) return null;
    return url.pathname + url.search + url.hash;
  } catch {
    return null;
  }
}
