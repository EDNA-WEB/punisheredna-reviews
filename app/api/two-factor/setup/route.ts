import { NextResponse } from 'next/server';
import QRCode from 'qrcode';
import { prisma } from '@/lib/prisma';
import { twoFactorUser, unauthorized } from '@/lib/twoFactorApi';
import { encryptSecret } from '@/lib/twoFactor';
import { generateTotpSecret, otpauthUrl, formatSecret } from '@/lib/totp';
import { hitSharedLimit } from '@/lib/sharedRateLimit';

export const dynamic = 'force-dynamic';

// 1. krok zapnutia: nové tajomstvo (zatiaľ len „čakajúce“) + QR kód pre aplikáciu.
// Platné bude až po potvrdení správnym kódom (/api/two-factor/enable).
export async function POST() {
  const user = await twoFactorUser();
  if (!user || user.banned || user.deleted) return unauthorized();
  if (user.twoFactorEnabledAt) return NextResponse.json({ error: 'Dvoufázové ověření už máš zapnuté.' }, { status: 400 });
  if (!(await hitSharedLimit(`2fa-setup:${user.id}`, 3_600_000, 10))) {
    return NextResponse.json({ error: 'Příliš mnoho pokusů. Zkus to znovu za hodinu.' }, { status: 429 });
  }

  const secret = generateTotpSecret();
  await prisma.user.update({ where: { id: user.id }, data: { twoFactorPendingSecret: encryptSecret(secret) } });
  const url = otpauthUrl(secret, user.name);
  const qrSvg = await QRCode.toString(url, { type: 'svg', margin: 1, width: 220 });
  return NextResponse.json({ secret: formatSecret(secret), otpauthUrl: url, qrSvg });
}
