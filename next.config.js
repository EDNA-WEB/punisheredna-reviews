/** @type {import('next').NextConfig} */
const nextConfig = {
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
          // Obmedzí prístup k citlivým funkciám prehliadača (kamera, mikrofón, poloha), ktoré web nepotrebuje
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          // Obmedzí, odkiaľ sa smie na stránku načítať skript/obrázok/rámec — základná ochrana proti
          // vloženiu cudzieho škodlivého kódu (napr. cez zraniteľnosť v komentároch/recenziách)
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "img-src 'self' data: https:",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.youtube.com https://s.ytimg.com",
              "style-src 'self' 'unsafe-inline'",
              "frame-src https://www.youtube.com",
              "connect-src 'self'",
              "font-src 'self' data:"
            ].join('; ')
          }
        ]
      }
    ];
  }
};
module.exports = nextConfig;
