// ---------------------------------------------------------------------------
// Ostré obrázky: adresa obrázka v takej veľkosti, aby bol ostrý aj na jemných
// (retina) displejoch — čiže približne dvojnásobok šírky, v ktorej sa zobrazí.
//  - TMDB: zvolí vhodnú veľkosť (w185 … w1280)
//  - Cloudinary: f_auto (moderný formát AVIF/WebP), q_auto:good, 2× šírka
// Bezpečné aj v klientskom kóde (len úprava textu adresy).
// ---------------------------------------------------------------------------

const TMDB_RE = /(image\.tmdb\.org\/t\/p\/)(w\d+|h\d+|original)\//;
const TMDB_SIZES = [185, 342, 500, 780, 1280];

export function sharpImage(url: string | null | undefined, cssWidth: number): string {
  if (!url) return '';
  const target = Math.ceil(cssWidth * 2);
  if (TMDB_RE.test(url)) {
    const size = TMDB_SIZES.find((s) => s >= target);
    // Najviac w1280 — originál býva 3–4K a niekoľko MB.
    return url.replace(TMDB_RE, `$1w${size || 1280}/`);
  }
  if (url.includes('res.cloudinary.com') && url.includes('/upload/') && !/\/upload\/[^/]*(w_|f_auto)/.test(url)) {
    return url.replace('/upload/', `/upload/f_auto,q_auto:good,w_${target},c_limit/`);
  }
  return url;
}
