import { NextResponse } from 'next/server';
import { hitSharedLimit } from '@/lib/sharedRateLimit';
import { ipFromHeaders } from '@/lib/security/clientInfo';
import { requestPasswordReset } from '@/lib/email/account';

export const dynamic = 'force-dynamic';

// Žiadosť o obnovenie hesla e-mailom (web aj appka). Vždy odpovie rovnako,
// nech sa nedá zisťovať, ktoré adresy sú registrované.
export async function POST(req: Request) {
  // Max. 10 žiadostí za hodinu z jednej IP adresy (spoločné pre všetky servery).
  const ip = ipFromHeaders(req.headers) || 'unknown';
  if (!(await hitSharedLimit(`mail-reset:ip:${ip}`, 3_600_000, 10))) {
    return NextResponse.json({ error: 'Příliš mnoho pokusů. Zkuste to znovu za hodinu.' }, { status: 429 });
  }
  const body = await req.json().catch(() => ({}));
  try {
    await requestPasswordReset(typeof body?.email === 'string' ? body.email.slice(0, 200) : '');
  } catch (error) {
    console.error('[password-reset/request]', error);
  }
  return NextResponse.json({ ok: true });
}
