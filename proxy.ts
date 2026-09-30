import { NextResponse, type NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

// Next.js 16: tento súbor nahrádza middleware.ts (beží v prostredí Node.js).
// ---------------------------------------------------------------------------
// 1) Neprihlásený návštevník vidí LEN prihlásenie (a stránky potrebné na
//    registráciu / obnovu hesla / právne texty). Iná adresa → /login.
// 2) Bezpečnostné hlavičky pre každú stránku, vrátane prísnej CSP s nonce:
//    každá stránka dostane jednorazový náhodný kľúč a spustí sa LEN skript,
//    ktorý ho nesie (Next.js ho pridá svojim skriptom automaticky). Vložený
//    cudzí skript (XSS) kľúč nemá → prehliadač ho odmietne. Žiadne
//    'unsafe-inline' ani 'unsafe-eval' pre skripty.
// 3) Administrácia je pre každého okrem admina/redaktora "neexistujúca"
//    (404) — útočník ani nezistí, že tam niečo je. Voliteľne aj obmedzenie
//    na konkrétne IP adresy (premenná ADMIN_ALLOWED_IPS).
// ---------------------------------------------------------------------------

const PUBLIC_PATHS = ['/login', '/register', '/zabudnute-heslo', '/overit-email', '/qr-prihlasenie', '/pravidla', '/zasady-ochrany-udajov', '/cookies'];
const isDev = process.env.NODE_ENV !== 'production';

function buildCsp(nonce: string) {
  return [
    `default-src 'self'`,
    // 'strict-dynamic': skripty načítané skriptom s nonce sú povolené (chunky Next.js);
    // https: a 'self' sú len záloha pre staré prehliadače, moderné ich pri strict-dynamic ignorujú.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https:${isDev ? " 'unsafe-eval'" : ''}`,
    // Štýly: React/Next vkladajú atribúty style="…" — tie bez 'unsafe-inline' nejdú.
    // Štýly nedokážu spustiť kód, preto je to bežný a bezpečný kompromis.
    `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`,
    `img-src 'self' data: blob: https:`,
    `font-src 'self' data: https://fonts.gstatic.com`,
    `connect-src 'self' https:${isDev ? ' ws: wss:' : ''}`,
    `media-src 'self' blob: https:`,
    `frame-src 'self' https:`,
    `worker-src 'self' blob:`,
    `manifest-src 'self'`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `frame-ancestors 'none'`,
    `upgrade-insecure-requests`
  ].join('; ');
}

function securityHeaders(res: NextResponse, csp: string | null) {
  if (csp) res.headers.set('Content-Security-Policy', csp);
  res.headers.set('Cross-Origin-Opener-Policy', 'same-origin');
  res.headers.set('X-Content-Type-Options', 'nosniff');
  res.headers.set('X-Frame-Options', 'DENY');
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.headers.set('Permissions-Policy', 'camera=(self), microphone=(), geolocation=(), payment=(), usb=()');
  return res;
}

function clientIp(req: NextRequest) {
  return (req as any).ip || req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || '';
}

// Voliteľné: ADMIN_ALLOWED_IPS = "1.2.3.4, 5.6.7.8" → administrácia len z týchto IP.
function ipAllowed(req: NextRequest) {
  const list = (process.env.ADMIN_ALLOWED_IPS || '').split(',').map((x) => x.trim()).filter(Boolean);
  if (list.length === 0) return true;
  return list.includes(clientIp(req));
}

function notFound(req: NextRequest) {
  // Prepíše na neexistujúcu adresu → Next.js vráti bežnú stránku 404.
  const res = NextResponse.rewrite(new URL('/stranka-neexistuje', req.url));
  res.headers.set('X-Robots-Tag', 'noindex, nofollow');
  return res;
}

export async function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  // --- Admin API: len IP obmedzenie (oprávnenie kontroluje každá route sama) ---
  if (pathname.startsWith('/api/admin')) {
    if (!ipAllowed(req)) return NextResponse.json({ error: 'Nenalezeno.' }, { status: 404 });
    return NextResponse.next();
  }

  const nonce = btoa(crypto.randomUUID());
  const csp = buildCsp(nonce);
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('x-pathname', pathname); // layout podľa toho skryje verejné menu v administrácii
  requestHeaders.set('Content-Security-Policy', csp); // Next.js si odtiaľ vezme nonce pre svoje skripty
  const pass = () => securityHeaders(NextResponse.next({ request: { headers: requestHeaders } }), csp);

  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))) return pass();

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const valid = !!token && !(token as any).invalid; // invalid = zablokovaný/zmazaný účet

  // --- Administrácia: pre všetkých okrem admina/redaktora "neexistuje" ---
  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    const isAdmin = valid && (token as any).role === 'ADMIN';
    const isEditor = valid && !!(token as any).isEditor;
    if (!(isAdmin || isEditor) || !ipAllowed(req)) return securityHeaders(notFound(req), null);
    const res = pass();
    res.headers.set('X-Robots-Tag', 'noindex, nofollow');
    return res;
  }

  if (valid) return pass();

  const url = req.nextUrl.clone();
  url.pathname = '/login';
  url.search = pathname === '/' ? '' : `?callbackUrl=${encodeURIComponent(pathname + search)}`;
  return securityHeaders(NextResponse.redirect(url), null);
}

export const config = {
  matcher: [
    // Všetky stránky okrem API, interných súborov Next.js a statických súborov.
    '/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|feed.xml|manifest|sw.js|\\.well-known|.*\\.(?:png|jpg|jpeg|gif|svg|webp|avif|ico|txt|xml|json|js|css|map|woff|woff2|ttf|mp4|webm)$).*)',
    // Admin API — kvôli voliteľnému obmedzeniu IP adries.
    '/api/admin/:path*'
  ]
};
