import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { forgetUserSessionCache } from '@/lib/auth';
import { validatePassword } from '@/lib/passwordRules';
import { issueRecoveryCode, recoveryCodeMatches } from '@/lib/recoveryCode';
import { hitSharedLimit } from '@/lib/sharedRateLimit';
import { ipFromHeaders } from '@/lib/security/clientInfo';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const nickname = typeof body?.nickname === 'string' ? body.nickname.trim().slice(0, 80) : '';
    const code = typeof body?.code === 'string' ? body.code.slice(0, 40) : '';
    const newPassword = typeof body?.newPassword === 'string' ? body.newPassword : '';
    if (!nickname || !code || !newPassword) {
      return NextResponse.json({ error: 'Vyplň prosím přezdívku, kód i nové heslo.' }, { status: 400 });
    }

    // Ochrana proti hádaniu kódu — spoločný limit pre všetky servery:
    // max. 8 pokusov za 15 minút z jednej IP a 10 pokusov denne na jednu prezývku.
    const ip = ipFromHeaders(req.headers) || 'unknown';
    const ipOk = await hitSharedLimit(`recovery:ip:${ip}`, 15 * 60_000, 8, { failClosed: true });
    const nickOk = await hitSharedLimit(`recovery:nick:${nickname.toLowerCase()}`, 24 * 3_600_000, 10, { failClosed: true });
    if (!ipOk || !nickOk) {
      return NextResponse.json({ error: 'Příliš mnoho pokusů. Zkus to prosím později.' }, { status: 429 });
    }

    const trimmedCode = String(code).trim().toUpperCase();
    const user = await prisma.user.findUnique({ where: { name: nickname } });

    // Zámerne rovnaká hláška pri nesprávnej prezývke aj pri nesprávnom kóde —
    // aby sa nedalo cez chybové hlášky zisťovať, ktoré prezývky na webe existujú.
    if (!user || !recoveryCodeMatches(user.recoveryCode, trimmedCode)) {
      return NextResponse.json({ error: 'Nesprávná přezdívka nebo bezpečnostní kód.' }, { status: 400 });
    }

    const passwordError = validatePassword(String(newPassword));
    if (passwordError) return NextResponse.json({ error: passwordError }, { status: 400 });

    const passwordHash = await bcrypt.hash(newPassword, 10);
    // Atómovo: kód sa dá použiť len raz, aj keby prišli dve žiadosti naraz.
    const { count } = await prisma.user.updateMany({
      where: { id: user.id, recoveryCode: trimmedCode },
      // Bezpečnosť: nové heslo odhlási všetky staršie prihlásenia (web aj appka).
      data: { passwordHash, failedLoginAttempts: 0, lockedUntil: null, passwordChangedAt: new Date(), recoveryCode: null }
    });
    if (count !== 1) {
      return NextResponse.json({ error: 'Nesprávná přezdívka nebo bezpečnostní kód.' }, { status: 400 });
    }

    forgetUserSessionCache(user.id);
    await issueRecoveryCode(user.id);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Požadavek selhal. Zkus to prosím znovu.' }, { status: 400 });
  }
}
