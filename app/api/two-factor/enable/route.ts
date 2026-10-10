import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { twoFactorUser, unauthorized, codeAttemptAllowed, tooMany } from '@/lib/twoFactorApi';
import { decryptSecret, generateBackupCodes } from '@/lib/twoFactor';
import { matchTotp } from '@/lib/totp';
import { forgetUserSessionCache } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// 2. krok zapnutia: potvrdenie heslom a kódom z aplikácie → overenie sa zapne,
// vrátia sa záložné kódy (ukážu sa len teraz, v databáze sú len ich odtlačky)
// a všetky zariadenia sa odhlásia.
export async function POST(req: Request) {
  const user = await twoFactorUser();
  if (!user || user.banned || user.deleted) return unauthorized();
  if (user.twoFactorEnabledAt) return NextResponse.json({ error: 'Dvoufázové ověření už máš zapnuté.' }, { status: 400 });
  if (!(await codeAttemptAllowed(user.id))) return tooMany();

  const body = await req.json().catch(() => ({}));
  const code = typeof body?.code === 'string' ? body.code : '';
  // Heslo aj tu — inak by si ukradnutým prihlásením mohol útočník zapnúť
  // overenie so SVOJÍM telefónom a skutočného majiteľa zamknúť.
  const password = typeof body?.password === 'string' ? body.password.slice(0, 200) : '';
  if (!password || !(await bcrypt.compare(password, user.passwordHash))) {
    return NextResponse.json({ error: 'Nesprávné heslo.' }, { status: 400 });
  }
  const secret = decryptSecret(user.twoFactorPendingSecret);
  if (!secret) return NextResponse.json({ error: 'Nastavení vypršelo, začni prosím znovu.' }, { status: 400 });
  const step = matchTotp(secret, code);
  if (step === null) return NextResponse.json({ error: 'Kód nesedí. Zkontroluj čas v telefonu a zkus aktuální kód.' }, { status: 400 });

  const { plain, hashes } = generateBackupCodes();
  const { count } = await prisma.user.updateMany({
    where: { id: user.id, twoFactorEnabledAt: null, twoFactorPendingSecret: user.twoFactorPendingSecret },
    data: {
      twoFactorSecret: user.twoFactorPendingSecret,
      twoFactorPendingSecret: null,
      twoFactorEnabledAt: new Date(),
      twoFactorLastStep: step,
      twoFactorBackupCodes: hashes,
      // Odhlási všetky doterajšie prihlásenia (web aj appka) — znova sa prihlási
      // už len ten, kto má aj telefón. (Rovnaký mechanizmus ako pri zmene hesla.)
      passwordChangedAt: new Date()
    }
  });
  if (count !== 1) return NextResponse.json({ error: 'Nastavení se změnilo, začni prosím znovu.' }, { status: 409 });
  forgetUserSessionCache(user.id);
  return NextResponse.json({ ok: true, backupCodes: plain });
}
