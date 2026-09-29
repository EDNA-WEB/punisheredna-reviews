import { NextResponse, type NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

// ---------------------------------------------------------------------------
// Neprihlásený návštevník vidí LEN prihlásenie (a stránky potrebné na
// registráciu / obnovu hesla / právne texty). Akákoľvek iná adresa ho pošle
// na /login a po prihlásení sa vráti tam, kam chcel ísť (callbackUrl).
// API, obrázky a systémové súbory sa tu nekontrolujú — tie si chránia samé
// (a mobilná appka má vlastné prihlásenie cez token).
// ---------------------------------------------------------------------------

// /app-prihlasenie nepotrebuje výnimku — je pod /api (appka sa ním prihlási do webového okna).
const PUBLIC_PATHS = ['/login', '/register', '/zabudnute-heslo', '/overit-email', '/qr-prihlasenie', '/pravidla', '/zasady-ochrany-udajov', '/cookies'];

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))) return NextResponse.next();

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  // token.invalid = zablokovaný alebo zmazaný účet (nastavuje lib/auth.ts)
  if (token && !(token as any).invalid) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = '/login';
  url.search = pathname === '/' ? '' : `?callbackUrl=${encodeURIComponent(pathname + search)}`;
  return NextResponse.redirect(url);
}

export const config = {
  // Všetko okrem API, interných súborov Next.js a statických súborov (obrázky, ikony, manifest…).
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|feed.xml|manifest|sw.js|.*\\.(?:png|jpg|jpeg|gif|svg|webp|avif|ico|txt|xml|json|js|css|map|woff|woff2|ttf|mp4|webm)$).*)']
};
