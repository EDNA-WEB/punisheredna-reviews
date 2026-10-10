import { NextResponse } from 'next/server';
import { prisma } from './prisma';
import { getSessionOrMobile } from './adminAuth';
import { hitSharedLimit } from './sharedRateLimit';

// Spoločné pre /api/two-factor/* (web aj appka): prihlásený používateľ
// s údajmi potrebnými pre dvojfaktorové overenie.
export async function twoFactorUser() {
  const session = await getSessionOrMobile();
  const id = (session?.user as any)?.id as string | undefined;
  if (!id) return null;
  return prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      role: true,
      isEditor: true,
      banned: true,
      deleted: true,
      passwordHash: true,
      twoFactorSecret: true,
      twoFactorPendingSecret: true,
      twoFactorEnabledAt: true,
      twoFactorBackupCodes: true
    }
  });
}

export const unauthorized = () => NextResponse.json({ error: 'Musíš být přihlášený.' }, { status: 401 });

// Proti hádaniu kódov: max. 10 overení za 15 minút na účet.
export async function codeAttemptAllowed(userId: string) {
  return hitSharedLimit(`2fa:${userId}`, 15 * 60_000, 10, { failClosed: true });
}

export const tooMany = () =>
  NextResponse.json({ error: 'Příliš mnoho pokusů. Zkus to znovu za 15 minut.' }, { status: 429 });
