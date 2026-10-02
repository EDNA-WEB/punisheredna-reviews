import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// „Nezapočítávat toto zařízení“ — technická cookie (nezbytná, bez súhlasu),
// ktorú analytika rešpektuje. Len pre admina.
async function guard() {
  const session = await getServerSession(authOptions);
  return !!session && (session.user as any).role === 'ADMIN';
}

export async function POST() {
  if (!(await guard())) return NextResponse.json({ error: 'Nemáš oprávnění.' }, { status: 403 });
  const res = NextResponse.json({ ok: true, excluded: true });
  res.cookies.set('kf_no_track', '1', { path: '/', maxAge: 60 * 60 * 24 * 365, httpOnly: true, secure: true, sameSite: 'lax' });
  return res;
}

export async function DELETE() {
  if (!(await guard())) return NextResponse.json({ error: 'Nemáš oprávnění.' }, { status: 403 });
  const res = NextResponse.json({ ok: true, excluded: false });
  res.cookies.set('kf_no_track', '', { path: '/', maxAge: 0 });
  return res;
}
