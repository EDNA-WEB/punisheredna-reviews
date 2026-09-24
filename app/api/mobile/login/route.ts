import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { signMobileToken } from '@/lib/mobileAuth';
import { checkIpRateLimit } from '@/lib/ipRateLimit';

// Rovnaká logika overenia ako na webe (lib/auth.ts) — rovnaké uzamknutie
// účtu po 5 nesprávnych pokusoch na 15 minút, rovnaká kontrola zablokovania.
// Jediný rozdiel: namiesto cookie session appka dostane podpísaný token.
export async function POST(req: Request) {
  if (!checkIpRateLimit(req, 'mobile-login', 15 * 60_000, 15)) {
    return NextResponse.json({ error: 'Príliš veľa pokusov. Skús to prosím o 15 minút znova.' }, { status: 429 });
  }

  const { nickname, password } = await req.json();
  if (!nickname || !password) {
    return NextResponse.json({ error: 'Zadaj prezývku aj heslo.' }, { status: 400 });
  }

  const user = await prisma.user.findFirst({
    where: { name: { equals: String(nickname).trim(), mode: 'insensitive' } }
  });
  if (!user) return NextResponse.json({ error: 'Nesprávna prezývka alebo heslo.' }, { status: 401 });

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    return NextResponse.json(
      { error: 'Príliš veľa nesprávnych pokusov. Účet je dočasne uzamknutý — skús to znova o 15 minút.' },
      { status: 423 }
    );
  }

  const valid = await bcrypt.compare(password, user.passwordHash);

  if (!valid) {
    const attempts = user.failedLoginAttempts + 1;
    const LOCK_THRESHOLD = 5;
    const LOCK_MINUTES = 15;
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: attempts >= LOCK_THRESHOLD ? 0 : attempts,
        lockedUntil: attempts >= LOCK_THRESHOLD ? new Date(Date.now() + LOCK_MINUTES * 60_000) : null
      }
    });
    return NextResponse.json({ error: 'Nesprávna prezývka alebo heslo.' }, { status: 401 });
  }

  if (user.failedLoginAttempts > 0 || user.lockedUntil) {
    await prisma.user.update({ where: { id: user.id }, data: { failedLoginAttempts: 0, lockedUntil: null } });
  }

  if (user.banned) {
    return NextResponse.json({ error: 'Tento účet bol zablokovaný administrátorom.' }, { status: 403 });
  }

  const token = signMobileToken({ userId: user.id, name: user.name, role: user.role });
  return NextResponse.json({
    token,
    user: { id: user.id, name: user.name, role: user.role, avatar: user.avatar }
  });
}
