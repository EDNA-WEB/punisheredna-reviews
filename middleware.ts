import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token as any;
    const path = req.nextUrl.pathname;

    // Admin sekcia — vyžaduje rolu ADMIN, s JEDNOU výnimkou: "Redaktor"
    // (isEditor) smie navyše len na stránku pridania novej novinky, nikam
    // inam v administrácii.
    if (path.startsWith('/admin')) {
      const isEditorException = token?.isEditor && path.startsWith('/admin/news/new');
      if (token?.role !== 'ADMIN' && !isEditorException) {
        return NextResponse.redirect(new URL('/login', req.url));
      }
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
  // Vynechané: API (vlastné overenia), statické súbory Next.js, KAŽDÝ súbor
  // v /public priečinku (podľa prípony — obrázky, ikony, manifest, sw.js,
  // atď.), a stránky potrebné PRED prihlásením (prihlásenie, registrácia,
  // overenie e-mailu, zabudnuté heslo) — a tiež právne/kontaktné stránky
  // (súkromie, cookies, napíš nám), sitemap a feed pre vyhľadávače a
  // čítačky RSS. Úplne všetko ostatné vyžaduje prihlásenie.
  //
  // Vzor podľa prípony je zámerne VŠEOBECNÝ (nie zoznam konkrétnych názvov
  // súborov) — presne toto bol problém pri prvom nasadení: nový obrázok v
  // /public (appstore-badge.png a pod.) by inak sám o sebe skončil za
  // prihlasovacou stenou, kým by si na to niekto nemusel prísť ručne.
  matcher: [
    '/((?!api|_next/static|_next/image|login|register|overit-email|zabudnute-heslo|zasady-ochrany-udajov|cookies|napis-nam|.*\\.(?:png|jpg|jpeg|svg|ico|webp|gif|json|txt|xml|js|html)$).*)'
  ]
};
