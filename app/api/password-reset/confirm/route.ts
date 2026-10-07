import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { forgetUserSessionCache } from '@/lib/auth';
import { validatePassword } from '@/lib/passwordRules';
import { findResetUser } from '@/lib/email/account';

export const dynamic = 'force-dynamic';

// Nastavenie nového hesla z odkazu v e-maile. Odkaz sa tým zneplatní a
// všetky prihlásenia (web aj appka) sa odhlásia (passwordChangedAt).
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const token = typeof body?.token === 'string' ? body.token : '';
  const password = typeof body?.password === 'string' ? body.password : '';

  const user = await findResetUser(token);
  if (!user) return NextResponse.json({ error: 'Odkaz vypršel nebo už byl použit. Požádej o nový.', code: 'EXPIRED' }, { status: 410 });

  const passwordError = validatePassword(password);
  if (passwordError) return NextResponse.json({ error: passwordError }, { status: 400 });

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: await bcrypt.hash(password, 10),
      passwordResetHash: null,
      passwordResetExpires: null,
      passwordChangedAt: new Date(),
      // Odkaz prišiel na e-mail → adresa je tým overená.
      emailVerified: true,
      verificationToken: null,
      failedLoginAttempts: 0,
      lockedUntil: null
    }
  });
  forgetUserSessionCache(user.id);
  return NextResponse.json({ ok: true });
}
