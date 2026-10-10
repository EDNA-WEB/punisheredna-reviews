import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { twoFactorUser, unauthorized, codeAttemptAllowed, tooMany } from '@/lib/twoFactorApi';
import { twoFactorRequiredFor, verifySecondFactor } from '@/lib/twoFactor';
import { forgetUserSessionCache } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// Vypnutie overenia: heslo + aktuálny kód. Admin a redaktori si ho vypnúť nemôžu.
export async function POST(req: Request) {
  const user = await twoFactorUser();
  if (!user || user.banned || user.deleted) return unauthorized();
  if (!user.twoFactorEnabledAt) return NextResponse.json({ error: 'Dvoufázové ověření nemáš zapnuté.' }, { status: 400 });
  if (twoFactorRequiredFor(user)) {
    return NextResponse.json({ error: 'Administrátoři a redaktoři musí mít dvoufázové ověření zapnuté.' }, { status: 403 });
  }
  if (!(await codeAttemptAllowed(user.id))) return tooMany();

  const body = await req.json().catch(() => ({}));
  const password = typeof body?.password === 'string' ? body.password.slice(0, 200) : '';
  if (!password || !(await bcrypt.compare(password, user.passwordHash))) {
    return NextResponse.json({ error: 'Nesprávné heslo.' }, { status: 400 });
  }
  if (!(await verifySecondFactor(user.id, typeof body?.code === 'string' ? body.code : ''))) {
    return NextResponse.json({ error: 'Kód nesedí.' }, { status: 400 });
  }
  await prisma.user.update({
    where: { id: user.id },
    data: { twoFactorSecret: null, twoFactorPendingSecret: null, twoFactorEnabledAt: null, twoFactorBackupCodes: [], twoFactorLastStep: null }
  });
  forgetUserSessionCache(user.id);
  return NextResponse.json({ ok: true });
}
