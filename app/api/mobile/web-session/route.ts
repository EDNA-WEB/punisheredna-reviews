import { NextResponse } from 'next/server';
import { encode } from 'next-auth/jwt';
import { getMobileUser } from '@/lib/mobileAuth';

export const dynamic = 'force-dynamic';

const MAX_AGE = 10 * 24 * 60 * 60; // 10 dní — ako "Zapamätať si ma" na webe

// Appka otvára niektoré stránky webu vo vlastnom okne (WebView). Keďže web je
// pre neprihlásených zamknutý, appka pri otvorení zavolá túto adresu so svojím
// prihlasovacím tokenom — server z neho vytvorí bežné webové prihlásenie
// (rovnaký formát ako NextAuth v lib/auth.ts) a presmeruje na cieľovú stránku.
// ?to=/movie/xyz  (len cesty v rámci webu)
export async function GET(req: Request) {
  const url = new URL(req.url);
  const to = url.searchParams.get('to') || '/';
  const safeTo = to.startsWith('/') && !to.startsWith('//') ? to : '/';

  const user = await getMobileUser(req);
  if (!user || user.banned) {
    return NextResponse.redirect(new URL(`/login?callbackUrl=${encodeURIComponent(safeTo)}`, url.origin));
  }

  const token = await encode({
    token: {
      sub: user.id,
      name: user.name,
      email: user.email,
      picture: user.avatar || null,
      id: user.id,
      role: user.role,
      membershipUntil: user.membershipUntil || null,
      isEditor: (user as any).isEditor || false,
      exp: Math.floor(Date.now() / 1000) + MAX_AGE
    },
    secret: process.env.NEXTAUTH_SECRET as string,
    maxAge: MAX_AGE
  });

  const secure = (process.env.NEXTAUTH_URL || url.origin).startsWith('https://');
  const res = NextResponse.redirect(new URL(safeTo, url.origin));
  res.cookies.set(secure ? '__Secure-next-auth.session-token' : 'next-auth.session-token', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure,
    path: '/',
    maxAge: MAX_AGE
  });
  return res;
}
