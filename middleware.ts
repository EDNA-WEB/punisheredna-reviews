import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token as any;
    const path = req.nextUrl.pathname;

    // Admin sekcia — nezmenené správanie, vyžaduje rolu ADMIN.
    if (path.startsWith('/admin')) {
      if (token?.role !== 'ADMIN') {
        return NextResponse.redirect(new URL('/login', req.url));
      }
      return NextResponse.next();
    }

    // Administrátori majú vždy prístup k celému webu bez ohľadu na členstvo.
    if (token?.role === 'ADMIN') return NextResponse.next();

    // Tieto cesty potrebujú prihlásenie (o to sa stará "authorized" nižšie),
    // ale NIE aktívne členstvo — inak by si používateľ nemohol prečítať
    // doručený kód v Pošte, ani ho uplatniť v Nastaveniach.
    if (path.startsWith('/messages') || path.startsWith('/nastavenia')) {
      return NextResponse.next();
    }

    // Zvyšok webu (vrátane hlavnej stránky) vyžaduje aktívne, nevypršané členstvo.
    const membershipUntil = token?.membershipUntil ? new Date(token.membershipUntil) : null;
    const hasMembership = !!(membershipUntil && membershipUntil > new Date());
    if (!hasMembership) {
      return NextResponse.redirect(new URL('/nastavenia/clenstvo', req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      // Vyžaduje prihlásenie pre KAŽDÚ cestu, čo prejde cez matcher nižšie —
      // presne to je "web schovaný za paywallom": bez prihlásenia sa
      // nezobrazí vôbec nič okrem výslovne vylúčených verejných stránok.
      authorized: ({ token }) => !!token
    },
    pages: {
      signIn: '/login'
    }
  }
);

export const config = {
  // Vynechané z kontroly: API (tie majú vlastné overenia), statické súbory
  // Next.js, ikony/manifest/service worker pre PWA, a verejné stránky
  // potrebné PRED prihlásením (prihlásenie, registrácia, overenie e-mailu,
  // zabudnuté heslo). Úplne všetko ostatné ide cez kontrolu vyššie.
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|login|register|overit-email|zabudnute-heslo|robots.txt|sitemap.xml|feed.xml|manifest.json|sw.js|offline.html|icon-192.png|icon-512.png|icon-maskable-512.png|apple-touch-icon.png|logo.svg).*)'
  ]
};
