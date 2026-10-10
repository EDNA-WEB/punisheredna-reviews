import crypto from 'crypto';
import { prisma } from './prisma';
import { encryptMessageBody, decryptMessageBody } from './serverCrypto';
import { matchTotp } from './totp';
import { purposeSecret, verifyKeys } from './secrets';

// ---------------------------------------------------------------------------
// Dvojfaktorové overenie (2FA): druhý krok prihlásenia kódom z aplikácie
// v mobile alebo jednorazovým záložným kódom.
//  - Dostupné pre každého, POVINNÉ pre admina a redaktorov (vypnúť sa dá
//    premennou ADMIN_2FA_REQUIRED=false — len núdzová poistka).
//  - Tajomstvo je v databáze zašifrované, záložné kódy len ako odtlačky.
//  - Každý kód z aplikácie sa dá použiť len raz (twoFactorLastStep).
// ---------------------------------------------------------------------------

export const BACKUP_CODE_COUNT = 8;
const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export function twoFactorRequiredFor(user: { role?: string | null; isEditor?: boolean | null } | null | undefined): boolean {
  if (!user) return false;
  if (process.env.ADMIN_2FA_REQUIRED === 'false') return false;
  return user.role === 'ADMIN' || !!user.isEditor;
}

export function encryptSecret(secret: string): string {
  const { ciphertext, iv } = encryptMessageBody(secret);
  return `${iv}:${ciphertext}`;
}

export function decryptSecret(stored: string | null | undefined): string | null {
  if (!stored) return null;
  const i = stored.indexOf(':');
  if (i < 0) return null;
  try {
    return decryptMessageBody(stored.slice(i + 1), stored.slice(0, i));
  } catch (err) {
    console.error('[twoFactor] dešifrovanie tajomstva zlyhalo', err);
    return null;
  }
}

// Odtlačok záložného kódu — HMAC s tajným kľúčom servera, takže ani pri úniku
// databázy sa kódy nedajú vyskúšať naslepo.
function hashBackupCode(code: string, key: string = purposeSecret('twofactor')): string {
  return crypto.createHmac('sha256', key).update(`kf-2fa:${code}`).digest('hex');
}

function normalizeBackupCode(raw: string): string | null {
  const c = String(raw || '').toUpperCase().replace(/[\s-]/g, '');
  return /^[A-Z0-9]{8}$/.test(c) ? c : null;
}

// Nová sada záložných kódov: { plain } ukážeme používateľovi raz, { hashes } uložíme.
export function generateBackupCodes(): { plain: string[]; hashes: string[] } {
  const plain: string[] = [];
  for (let i = 0; i < BACKUP_CODE_COUNT; i++) {
    let c = '';
    for (let j = 0; j < 8; j++) c += CODE_CHARS[crypto.randomInt(CODE_CHARS.length)];
    plain.push(`${c.slice(0, 4)}-${c.slice(4)}`);
  }
  return { plain, hashes: plain.map((p) => hashBackupCode(p.replace('-', ''))) };
}

// Overí kód z aplikácie (6 číslic) alebo záložný kód (8 znakov) pre používateľa
// so ZAPNUTÝM overením. Kód z aplikácie sa zapíše ako použitý, záložný kód sa
// zmaže — obe atómovo, takže ten istý kód neprejde dvakrát ani súbežne.
export async function verifySecondFactor(userId: string, rawCode: string): Promise<'totp' | 'backup' | null> {
  const code = String(rawCode || '').trim().slice(0, 20);
  if (!code) return null;

  if (/^\d{3}\s?\d{3}$/.test(code)) {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { twoFactorSecret: true, twoFactorEnabledAt: true } });
    if (!user?.twoFactorEnabledAt) return null;
    const secret = decryptSecret(user.twoFactorSecret);
    if (!secret) return null;
    const step = matchTotp(secret, code);
    if (step === null) return null;
    const { count } = await prisma.user.updateMany({
      where: { id: userId, OR: [{ twoFactorLastStep: null }, { twoFactorLastStep: { lt: step } }] },
      data: { twoFactorLastStep: step }
    });
    return count === 1 ? 'totp' : null;
  }

  const backup = normalizeBackupCode(code);
  if (!backup) return null;
  let removed = 0;
  for (const key of verifyKeys('twofactor')) {
    const hash = hashBackupCode(backup, key);
    removed = await prisma.$executeRaw`
      UPDATE "User" SET "twoFactorBackupCodes" = array_remove("twoFactorBackupCodes", ${hash})
      WHERE "id" = ${userId} AND "twoFactorEnabledAt" IS NOT NULL AND ${hash} = ANY("twoFactorBackupCodes")`;
    if (removed === 1) break;
  }
  return removed === 1 ? 'backup' : null;
}
