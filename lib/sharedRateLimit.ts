import { prisma } from './prisma';

// ---------------------------------------------------------------------------
// ZDIEĽANÝ LIMIT POKUSOV — v databáze, spoločný pre všetky inštancie servera.
// (lib/ipRateLimit.ts drží počty len v pamäti jednej inštancie, na Verceli sa
// preto limity násobia a pri reštarte miznú.)
//
// Pevné okno: kľúč → počet pokusov a čas vypršania. Jeden atómový SQL príkaz,
// takže ani súbežné požiadavky limit neobídu.
// Ak by databáza zlyhala, limit požiadavku PUSTÍ (web nesmie spadnúť kvôli
// limitu) a chyba sa zaloguje.
// ---------------------------------------------------------------------------

export async function hitSharedLimit(
  key: string,
  windowMs: number,
  max: number,
  opts: { failClosed?: boolean } = {}
): Promise<boolean> {
  const k = key.slice(0, 190);
  // Čas posielame z aplikácie (UTC) — nezávisí od nastavenia časového pásma databázy.
  const now = new Date();
  const resetAt = new Date(now.getTime() + windowMs);
  try {
    const rows = await prisma.$queryRaw<{ count: number }[]>`
      INSERT INTO "RateLimitBucket" ("key", "count", "resetAt") VALUES (${k}, 1, ${resetAt})
      ON CONFLICT ("key") DO UPDATE SET
        "count" = CASE WHEN "RateLimitBucket"."resetAt" < ${now} THEN 1 ELSE "RateLimitBucket"."count" + 1 END,
        "resetAt" = CASE WHEN "RateLimitBucket"."resetAt" < ${now} THEN EXCLUDED."resetAt" ELSE "RateLimitBucket"."resetAt" END
      RETURNING "count"`;
    maybeCleanup();
    return Number(rows[0]?.count ?? 0) <= max;
  } catch (err) {
    console.error('[sharedRateLimit]', err);
    // Citlivé miesta (obnovovacie kódy, členské kódy) radšej odmietnu, než by pustili hádanie bez limitu.
    return !opts.failClosed;
  }
}

// Vymazanie limitu (napr. po úspešnom prihlásení).
export async function resetSharedLimit(key: string) {
  await prisma.$executeRaw`DELETE FROM "RateLimitBucket" WHERE "key" = ${key.slice(0, 190)}`.catch(() => {});
}

function maybeCleanup() {
  const g = globalThis as any;
  if (Date.now() - (g.__rlCleanupAt || 0) < 10 * 60_000) return;
  g.__rlCleanupAt = Date.now();
  const before = new Date(Date.now() - 3_600_000);
  prisma.$executeRaw`DELETE FROM "RateLimitBucket" WHERE "resetAt" < ${before}`.catch(() => {});
}
