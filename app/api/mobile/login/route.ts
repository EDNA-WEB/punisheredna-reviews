import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { signMobileToken } from '@/lib/mobileAuth';
import { checkIpRateLimit } from '@/lib/ipRateLimit';
import { withLoginLog } from '@/lib/security/activityLog';
import { ipFromHeaders } from '@/lib/security/clientInfo';
import { loginAttemptAllowed, registerFailedLogin, clearFailedLogins } from '@/lib/loginGuard';

// Rovnaká logika overenia ako na webe (lib/auth.ts) — rovnaké uzamknutie
// účtu po 5 nesprávnych pokusoch na 15 minút, rovnaká kontrola zablokovania.
// Jediný rozdiel: namiesto cookie session appka dostane podpísaný token.
async function __loginPOST(req: Request) {
  if (!checkIpRateLimit(req, 'mobile-login', 15 * 60_000, 15)) {
    return NextResponse.json({ error: 'Příliš mnoho pokusů. Zkus to prosím znovu za 15 minut.' }, { status: 429 });
  }

  const body = await req.json().catch(() => ({}));
  const nickname = typeof body?.nickname === 'string' ? body.nickname.slice(0, 80) : '';
  const password = typeof body?.password === 'string' ? body.password.slice(0, 200) : '';
  if (!nickname || !password) {
    return NextResponse.json({ error: 'Zadej přezdívku i heslo.' }, { status: 400 });
  }

  // Zdieľaný limit na IP aj prezývku (platí naprieč všetkými servermi).
  if (!(await loginAttemptAllowed(ipFromHeaders(req.headers), nickname))) {
    return NextResponse.json({ error: 'Příliš mnoho pokusů. Zkus to prosím znovu za 15 minut.' }, { status: 429 });
  }

  const user = await prisma.user.findFirst({
    where: { name: { equals: nickname.trim(), mode: 'insensitive' } }
  });
  if (!user) return NextResponse.json({ error: 'Nesprávná přezdívka nebo heslo.' }, { status: 401 });

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    return NextResponse.json(
      { error: 'Příliš mnoho nesprávných pokusů. Účet je dočasně uzamčen — zkus to znovu za 15 minut.' },
      { status: 423 }
    );
  }

  const valid = await bcrypt.compare(password, user.passwordHash);

  if (!valid) {
    await registerFailedLogin(user.id);
    return NextResponse.json({ error: 'Nesprávná přezdívka nebo heslo.' }, { status: 401 });
  }

  await clearFailedLogins(user);

  if (user.banned) {
    return NextResponse.json({ error: 'Tento účet byl zablokován administrátorem.' }, { status: 403 });
  }

  // Nový účet sa prihlási až po overení e-mailu (staršie účty majú mustVerifyEmail = false).
  if ((user as any).mustVerifyEmail && !(user as any).emailVerified) {
    return NextResponse.json({ error: 'Účet ještě není ověřený. Klikni na odkaz v e-mailu, který jsme ti poslali.', code: 'EMAIL_NOT_VERIFIED' }, { status: 403 });
  }
  const token = signMobileToken({ userId: user.id, name: user.name, role: user.role });
  return NextResponse.json({
    token,
    user: { id: user.id, name: user.name, role: user.role, avatar: user.avatar }
  });
}

// Bezpečnosť: úspešné prihlásenie v appke sa zaznamená (IP záznamy).
export async function POST(...args: Parameters<typeof __loginPOST>) {
  return withLoginLog(args, __loginPOST);
}
