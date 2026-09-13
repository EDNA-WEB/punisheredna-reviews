import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { validatePassword } from '@/lib/passwordRules';
import { checkIpRateLimit } from '@/lib/ipRateLimit';
import { issueRecoveryCode } from '@/lib/recoveryCode';

export async function POST(req: Request) {
  try {
    // Ochrana proti hádaniu kódu dokola — max. 8 pokusov za 15 minút z jednej IP.
    if (!checkIpRateLimit(req, 'reset-password', 15 * 60_000, 8)) {
      return NextResponse.json({ error: 'Príliš veľa pokusov. Skús to prosím neskôr.' }, { status: 429 });
    }

    const { nickname, code, newPassword } = await req.json();
    if (!nickname || !code || !newPassword) {
      return NextResponse.json({ error: 'Vyplň prosím prezývku, kód aj nové heslo.' }, { status: 400 });
    }

    const trimmedCode = String(code).trim().toUpperCase();
    const user = await prisma.user.findUnique({ where: { name: String(nickname).trim() } });

    // Zámerne rovnaká hláška pri nesprávnej prezývke aj pri nesprávnom kóde —
    // aby sa nedalo cez chybové hlášky zisťovať, ktoré prezývky na webe existujú.
    if (!user || !user.recoveryCode || user.recoveryCode !== trimmedCode) {
      return NextResponse.json({ error: 'Nesprávna prezývka alebo bezpečnostný kód.' }, { status: 400 });
    }

    const passwordError = validatePassword(String(newPassword));
    if (passwordError) return NextResponse.json({ error: passwordError }, { status: 400 });

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, failedLoginAttempts: 0, lockedUntil: null }
    });

    await issueRecoveryCode(user.id);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Požiadavka zlyhala. Skús to prosím znova.' }, { status: 400 });
  }
}
