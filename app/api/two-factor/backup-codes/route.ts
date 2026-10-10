import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { twoFactorUser, unauthorized, codeAttemptAllowed, tooMany } from '@/lib/twoFactorApi';
import { generateBackupCodes, verifySecondFactor } from '@/lib/twoFactor';

export const dynamic = 'force-dynamic';

// Nová sada záložných kódov (staré prestanú platiť). Potrebný aktuálny kód.
export async function POST(req: Request) {
  const user = await twoFactorUser();
  if (!user || user.banned || user.deleted) return unauthorized();
  if (!user.twoFactorEnabledAt) return NextResponse.json({ error: 'Dvoufázové ověření nemáš zapnuté.' }, { status: 400 });
  if (!(await codeAttemptAllowed(user.id))) return tooMany();

  const body = await req.json().catch(() => ({}));
  if (!(await verifySecondFactor(user.id, typeof body?.code === 'string' ? body.code : ''))) {
    return NextResponse.json({ error: 'Kód nesedí.' }, { status: 400 });
  }
  const { plain, hashes } = generateBackupCodes();
  await prisma.user.update({ where: { id: user.id }, data: { twoFactorBackupCodes: hashes } });
  return NextResponse.json({ ok: true, backupCodes: plain });
}
