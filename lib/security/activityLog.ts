import { prisma } from '../prisma';
import { currentHeaders, ipFromHeaders, uaFromHeaders } from './clientInfo';

// ---------------------------------------------------------------------------
// ZÁZNAMY ČINNOSTI (IP adresy) — len pre úradné žiadosti polície/súdu.
// Ukladá sa: kto, kedy, čo urobil (prihlásenie, recenzia, komentár, príspevok,
// správa…), z akej IP a zariadenia. Záznamy sa po 6 mesiacoch automaticky
// mažú — okrem používateľov, pri ktorých admin mazanie zastavil (IpLogHold).
// ---------------------------------------------------------------------------

export const RETENTION_DAYS = 183;

export const ACTION_LABELS: Record<string, string> = {
  login: 'Přihlášení',
  review: 'Recenze',
  comment: 'Komentář',
  thread: 'Nové téma ve fóru',
  post: 'Příspěvek ve fóru',
  message: 'Soukromá zpráva',
  blog: 'Článek (blog)',
  shop_review: 'Hodnocení v obchodě',
  register: 'Registrace'
};

export async function recordActivity(userId: string | null | undefined, action: string, targetId?: string | null) {
  if (!userId) return;
  try {
    const h = await currentHeaders();
    const ip = ipFromHeaders(h);
    if (!ip) return; // mimo požiadavky návštevníka (cron, skript) nie je čo ukladať
    await prisma.activityLog.create({
      data: { userId, action, targetId: targetId ? String(targetId).slice(0, 64) : null, ip, userAgent: uaFromHeaders(h) }
    });
    maybePurge();
  } catch (err) {
    console.error('[activityLog]', err);
  }
}

// Mazanie starých záznamov — najviac raz za 12 hodín na inštanciu servera.
function maybePurge() {
  const g = globalThis as any;
  if (Date.now() - (g.__activityPurgeAt || 0) < 12 * 60 * 60_000) return;
  g.__activityPurgeAt = Date.now();
  purgeOldLogs().catch((err) => console.error('[activityLog] mazanie', err));
}

export async function purgeOldLogs() {
  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60_000);
  for (let i = 0; i < 20; i++) {
    const n = await prisma.$executeRaw`
      DELETE FROM "ActivityLog" WHERE "id" IN (
        SELECT "id" FROM "ActivityLog"
        WHERE "createdAt" < ${cutoff} AND "userId" NOT IN (SELECT "userId" FROM "IpLogHold")
        LIMIT 2000
      )`;
    if (n < 2000) break;
  }
  await prisma.$executeRaw`DELETE FROM "RegistrationAttempt" WHERE "createdAt" < ${cutoff}`;
}

// Obal pre prihlásenie v appke: po úspešnom prihlásení zapíše záznam.
function userIdFromLoginResponse(data: any): string | null {
  const direct = data?.user?.id || data?.userId || data?.id;
  if (typeof direct === 'string') return direct;
  const token = typeof data?.token === 'string' ? data.token : typeof data?.accessToken === 'string' ? data.accessToken : null;
  if (!token || token.split('.').length !== 3) return null;
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'));
    const id = payload?.id || payload?.userId || payload?.sub;
    return typeof id === 'string' ? id : null;
  } catch {
    return null;
  }
}

export async function withLoginLog<A extends any[]>(args: A, handler: (...args: A) => Promise<Response>): Promise<Response> {
  const res = await handler(...args);
  if (res.ok) {
    try {
      const id = userIdFromLoginResponse(await res.clone().json());
      if (id) await recordActivity(id, 'login');
    } catch {}
  }
  return res;
}
