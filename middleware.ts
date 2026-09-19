import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token as any;
    const path = req.nextUrl.pathname;

    // Admin sekcia — nezmenené, vyžaduje navyše rolu ADMIN (rovnaké ako
    // doteraz, len teraz je to jedna z dvoch vetiev namiesto celého middleware).
    if (path.startsWith('/admin') && token?.role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/login', req.url));
    }

    // Zvyšok webu — stačí byť prihlásený (žiadna kontrola členstva, len
    // existencia účtu). Samotnú kontrolu "je vôbec prihlásený" už robí
    // "authorized" nižšie pre všetko, čo prejde cez matcher — sem sa teda
    // dostane len niekto, kto token už má.
    return NextResponse.next();
  },
  {
    callbacks: {
      // Vyžaduje prihlásenie pre KAŽDÚ cestu, čo prejde cez matcher nižšie.
      authorized: ({ token }) => !!token
    },
    pages: {
      signIn: '/login'
    }
  }
);

export const config = {
  // Vynechané: API (vlastné overenia), statické súbory Next.js, PWA
  // ikony/manifest/service worker, a stránky potrebné PRED prihlásením
  // (prihlásenie, registrácia, overenie e-mailu, zabudnuté heslo) — a tiež
  // právne/kontaktné stránky (súkromie, cookies, napíš nám), sitemap a feed
  // pre vyhľadávače a čítačky RSS. Úplne všetko ostatné vyžaduje prihlásenie.
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|login|register|overit-email|zabudnute-heslo|zasady-ochrany-udajov|cookies|napis-nam|robots.txt|sitemap.xml|feed.xml|manifest.json|sw.js|offline.html|icon-192.png|icon-512.png|icon-maskable-512.png|apple-touch-icon.png|logo.svg).*)'
  ]
};
