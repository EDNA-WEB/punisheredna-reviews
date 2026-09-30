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
      return NextResponse.json({ error: 'Příliš mnoho pokusů. Zkus to prosím později.' }, { status: 429 });
    }

    const { nickname, code, newPassword } = await req.json();
    if (!nickname || !code || !newPassword) {
      return NextResponse.json({ error: 'Vyplň prosím přezdívku, kód i nové heslo.' }, { status: 400 });
    }

    const trimmedCode = String(code).trim().toUpperCase();
    const user = await prisma.user.findUnique({ where: { name: String(nickname).trim() } });

    // Zámerne rovnaká hláška pri nesprávnej prezývke aj pri nesprávnom kóde —
    // aby sa nedalo cez chybové hlášky zisťovať, ktoré prezývky na webe existujú.
    if (!user || !user.recoveryCode || user.recoveryCode !== trimmedCode) {
      return NextResponse.json({ error: 'Nesprávná přezdívka nebo bezpečnostní kód.' }, { status: 400 });
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
    return NextResponse.json({ error: 'Požadavek selhal. Zkus to prosím znovu.' }, { status: 400 });
  }
}
