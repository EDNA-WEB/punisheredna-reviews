/** @type {import('next').NextConfig} */
const nextConfig = {
  // Neprezrádzať hlavičkou "X-Powered-By: Next.js", na čom web beží.
  poweredByHeader: false,
  experimental: {
    serverActions: { bodySizeLimit: '8mb' }
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          // Zabráni vloženiu webu do <iframe> na inej stránke (ochrana proti clickjackingu)
          { key: 'X-Frame-Options', value: 'DENY' },
          // Zabráni prehliadaču "hádať" typ súboru inak, ako hovorí server (ochrana proti niektorým XSS trikom)
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // Pri odkazoch na iné weby posiela len doménu, nie celú URL s citlivými parametrami
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // Obmedzí prístup k citlivým funkciám prehliadača. Rovnaká hodnota ako v middleware.ts,
          // aby sa hlavičky nebili (kamera "self" = len pre odfotenie v správach na tomto webe).
          { key: 'Permissions-Policy', value: 'camera=(self), microphone=(), geolocation=(), payment=(), usb=()' },
          // Izolácia okna prehliadača od cudzích stránok (odporúčanie analyzátora — COOP)
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' }
          // Content-Security-Policy tu ZÁMERNE nie je — nastavuje ju middleware.ts, a to prísnejšie:
          // každá stránka dostane jednorazový kľúč (nonce), takže bez 'unsafe-inline' a 'unsafe-eval'.
          // Dve CSP hlavičky naraz by sa navzájom obmedzovali a oslabená by ostala viditeľná pre analyzátory.
        ]
      }
    ];
  }
};
// deploy-marker: 2026-09-30
module.exports = nextConfig;
