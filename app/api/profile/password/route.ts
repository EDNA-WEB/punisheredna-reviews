import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, forgetUserSessionCache } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { validatePassword } from '@/lib/passwordRules';
import { checkKeyRateLimit } from '@/lib/ipRateLimit';
import { issueRecoveryCode } from '@/lib/recoveryCode';

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Musíš byť prihlásený.' }, { status: 401 });

  const userId = (session.user as any).id;
  const { currentPassword, newPassword } = await req.json();
  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: 'Vyplň současné i nové heslo.' }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return NextResponse.json({ error: 'Uživatel se nenašel.' }, { status: 404 });

  // Ochrana proti hádaniu súčasného hesla dokola (napr. ak sa niekto dostal
  // k prihlásenému zariadeniu, no heslo nepozná).
  const rateLimitError = !checkKeyRateLimit(`password-change:${userId}`, 5 * 60_000, 5)
    ? 'Příliš mnoho pokusů o změnu hesla. Zkus to prosím za pár minut.'
    : null;
  if (rateLimitError) return NextResponse.json({ error: rateLimitError }, { status: 429 });

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) return NextResponse.json({ error: 'Současné heslo není správné.' }, { status: 400 });

  const passwordError = validatePassword(String(newPassword));
  if (passwordError) return NextResponse.json({ error: passwordError }, { status: 400 });

  const passwordHash = await bcrypt.hash(newPassword, 10);
  // Bezpečnosť: po zmene hesla sa odhlásia všetky prihlásenia (web aj appka),
  // aj prípadný útočník s ukradnutým prihlásením.
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash, passwordChangedAt: new Date() } });
  forgetUserSessionCache(user.id);

  await issueRecoveryCode(user.id).catch((err) => console.error('issueRecoveryCode', err));

  return NextResponse.json({ ok: true });
}
