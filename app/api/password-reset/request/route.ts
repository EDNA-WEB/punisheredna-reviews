import { NextResponse } from 'next/server';
import { requestPasswordReset } from '@/lib/email/account';

export const dynamic = 'force-dynamic';

// Žiadosť o obnovenie hesla e-mailom (web aj appka). Vždy odpovie rovnako,
// nech sa nedá zisťovať, ktoré adresy sú registrované.
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  try {
    await requestPasswordReset(typeof body?.email === 'string' ? body.email.slice(0, 200) : '');
  } catch (error) {
    console.error('[password-reset/request]', error);
  }
  return NextResponse.json({ ok: true });
}
