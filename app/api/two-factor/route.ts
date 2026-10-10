import { NextResponse } from 'next/server';
import { twoFactorUser, unauthorized } from '@/lib/twoFactorApi';
import { twoFactorRequiredFor } from '@/lib/twoFactor';

export const dynamic = 'force-dynamic';

// Stav dvojfaktorového overenia prihláseného používateľa (web aj appka).
export async function GET() {
  const user = await twoFactorUser();
  if (!user || user.banned || user.deleted) return unauthorized();
  return NextResponse.json({
    enabled: !!user.twoFactorEnabledAt,
    enabledAt: user.twoFactorEnabledAt,
    backupCodesLeft: user.twoFactorEnabledAt ? user.twoFactorBackupCodes.length : 0,
    required: twoFactorRequiredFor(user)
  });
}
