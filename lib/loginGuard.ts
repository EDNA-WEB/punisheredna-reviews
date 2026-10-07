import { prisma } from './prisma';
import { hitSharedLimit } from './sharedRateLimit';

// ---------------------------------------------------------------------------
// Ochrana prihlásenia (web aj appka) proti hádaniu hesiel.
//  - Limit na IP adresu: 20 pokusov za 15 min (spoločný pre všetky servery).
//  - Limit na prezývku: 10 pokusov za 15 min — zastaví aj útok z mnohých IP.
//    Obe kontroly bežia ešte PRED porovnaním hesla (bcrypt je drahý).
//  - Neúspešný pokus sa počíta jedným atómovým SQL príkazom, takže paralelné
//    pokusy už nedokážu obísť uzamknutie po 5 chybách.
// ---------------------------------------------------------------------------

export const LOCK_THRESHOLD = 5;
export const LOCK_MINUTES = 15;
const WINDOW_MS = 15 * 60_000;

export async function loginAttemptAllowed(ip: string | null, nickname: string): Promise<boolean> {
  const nick = nickname.trim().toLowerCase().slice(0, 80);
  const ipOk = await hitSharedLimit(`login:ip:${ip || 'unknown'}`, WINDOW_MS, 20);
  const nickOk = await hitSharedLimit(`login:nick:${nick}`, WINDOW_MS, 10);
  return ipOk && nickOk;
}

export async function registerFailedLogin(userId: string): Promise<void> {
  const lockUntil = new Date(Date.now() + LOCK_MINUTES * 60_000);
  await prisma.$executeRaw`
    UPDATE "User" SET
      "failedLoginAttempts" = CASE WHEN "failedLoginAttempts" + 1 >= ${LOCK_THRESHOLD} THEN 0 ELSE "failedLoginAttempts" + 1 END,
      "lockedUntil" = CASE WHEN "failedLoginAttempts" + 1 >= ${LOCK_THRESHOLD} THEN ${lockUntil} ELSE "lockedUntil" END
    WHERE "id" = ${userId}`;
}

export async function clearFailedLogins(user: { id: string; failedLoginAttempts: number; lockedUntil: Date | null }): Promise<void> {
  if (user.failedLoginAttempts > 0 || user.lockedUntil) {
    await prisma.user.update({ where: { id: user.id }, data: { failedLoginAttempts: 0, lockedUntil: null } });
  }
}
