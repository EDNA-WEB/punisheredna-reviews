import jwt from 'jsonwebtoken';
import { prisma } from './prisma';
import { memo } from './memoCache';
import { adminIpAllowed } from './adminIp';
import { twoFactorRequiredFor } from './twoFactor';
import { purposeSecret, verifyKeys } from './secrets';

// Samostatný autentifikačný systém pre mobilnú appku — NextAuth (na webe) je
// postavený na cookies, čo appka nemá k dispozícii rovnako ako prehliadač.
// Appka namiesto toho po prihlásení dostane tento token, uloží si ho lokálne
// (SecureStore) a posiela ho v hlavičke "Authorization: Bearer <token>" pri
// každom ďalšom volaní.
// Bezpečnosť: podpisuje sa VLASTNÝM kľúčom (MOBILE_JWT_SECRET, inak odvodený
// z NEXTAUTH_SECRET), nie priamo kľúčom webových relácií. Staršie tokeny
// podpísané pôvodným kľúčom platia do konca prechodného obdobia, nech sa
// nikto z appky neodhlási naraz.
const secret = () => purposeSecret('mobile');
const TOKEN_EXPIRY = '30d';

export type MobileTokenPayload = {
  userId: string;
  name: string;
  role: string;
};

export function signMobileToken(payload: MobileTokenPayload): string {
  return jwt.sign(payload, secret(), { expiresIn: TOKEN_EXPIRY });
}

// Overí token z hlavičky "Authorization: Bearer ..." a vráti prihláseného
// používateľa — alebo null, ak token chýba/je neplatný/účet je zablokovaný.
// Používa sa na začiatku KAŽDÉHO chráneného /api/mobile/* endpointu.
export async function getMobileUser(req: Request) {
  const authHeader = req.headers.get('authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return null;

  try {
    let decoded: MobileTokenPayload | null = null;
    for (const key of verifyKeys('mobile')) {
      try {
        decoded = jwt.verify(token, key, { algorithms: ['HS256'] }) as MobileTokenPayload;
        break;
      } catch {}
    }
    if (!decoded) return null;
    const payload = decoded;
    // Výkon: rovnaký používateľ posiela veľa požiadaviek za sebou (hlavná
    // obrazovka ich má ~15) — záznam si pamätáme 20 s namiesto dopytu pri každej.
    const user = await memo(`mobile-user:${payload.userId}`, 20_000, async () => prisma.user.findUnique({ where: { id: payload.userId } }));
    // Zmazaný účet sa odhlási zo všetkých zariadení (bezpečnosť, GDPR).
    if (!user || user.banned || (user as any).deleted) return null;
    // Neoverený nový účet sa do appky neprihlási (pozri /api/mobile/login).
    if ((user as any).mustVerifyEmail && !user.emailVerified) return null;
    // Po zmene hesla prestanú platiť všetky staršie prihlásenia.
    const changedAt = (user as any).passwordChangedAt ? new Date((user as any).passwordChangedAt).getTime() : 0;
    const issuedAt = ((payload as any).iat || 0) * 1000;
    if (changedAt && issuedAt < changedAt - 1000) return null;
    // Mimo povolených IP adries (ADMIN_ALLOWED_IPS) nemá admin ani redaktor
    // žiadne zvláštne práva. Kópia — záznam z pamäte sa nesmie meniť.
    // To isté pre admina/redaktora bez zapnutého dvojfaktorového overenia.
    if (twoFactorRequiredFor(user) && (!user.twoFactorEnabledAt || !adminIpAllowed(req.headers))) {
      return { ...user, role: 'READER', isEditor: false } as typeof user;
    }
    return user;
  } catch {
    return null;
  }
}

// "Naposledy aktívny" stačí zapísať raz za 2 minúty — nie pri každej požiadavke.
const lastTouch: Map<string, number> = (globalThis as any).__lastActiveTouch || ((globalThis as any).__lastActiveTouch = new Map());
export async function touchLastActive(userId: string) {
  const now = Date.now();
  if (now - (lastTouch.get(userId) || 0) < 120_000) return;
  lastTouch.set(userId, now);
  if (lastTouch.size > 5000) lastTouch.clear();
  await prisma.user.update({ where: { id: userId }, data: { lastActiveAt: new Date(now) } }).catch(() => {});
}
