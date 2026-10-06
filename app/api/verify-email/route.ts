import { NextResponse } from 'next/server';
import { verifyEmailToken } from '@/lib/email/account';

export const dynamic = 'force-dynamic';

// Overenie e-mailu (používa ho appka; web overuje priamo na stránke /overit-email).
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const result = await verifyEmailToken(typeof body?.token === 'string' ? body.token : '');
  if (result === 'ok' || result === 'already') return NextResponse.json({ ok: true, alreadyVerified: result === 'already' });
  if (result === 'expired') return NextResponse.json({ error: 'Odkaz vypršel. Pošli si nový.', code: 'EXPIRED' }, { status: 410 });
  return NextResponse.json({ error: 'Ověřovací odkaz je neplatný nebo už byl použit.', code: 'INVALID' }, { status: 404 });
}
