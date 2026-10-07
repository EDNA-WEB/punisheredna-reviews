import jwt from 'jsonwebtoken';
import { prisma } from './prisma';
import { memo } from './memoCache';

// Samostatný autentifikačný systém pre mobilnú appku — NextAuth (na webe) je
// postavený na cookies, čo appka nemá k dispozícii rovnako ako prehliadač.
// Appka namiesto toho po prihlásení dostane tento token, uloží si ho lokálne
// (SecureStore) a posiela ho v hlavičke "Authorization: Bearer <token>" pri
// každom ďalšom volaní. Podpisuje sa tým istým tajným kľúčom ako web
// (NEXTAUTH_SECRET), nech netreba spravovať druhý tajný kľúč naviac.
const SECRET = process.env.NEXTAUTH_SECRET as string;
const TOKEN_EXPIRY = '30d';

export type MobileTokenPayload = {
  userId: string;
  name: string;
  role: string;
};

export function signMobileToken(payload: MobileTokenPayload): string {
  return jwt.sign(payload, SECRET, { expiresIn: TOKEN_EXPIRY });
}

// Overí token z hlavičky "Authorization: Bearer ..." a vráti prihláseného
// používateľa — alebo null, ak token chýba/je neplatný/účet je zablokovaný.
// Používa sa na začiatku KAŽDÉHO chráneného /api/mobile/* endpointu.
export async function getMobileUser(req: Request) {
  const authHeader = req.headers.get('authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return null;

  try {
    const decoded = jwt.verify(token, SECRET, { algorithms: ['HS256'] }) as MobileTokenPayload;
    // Výkon: rovnaký používateľ posiela veľa požiadaviek za sebou (hlavná
    // obrazovka ich má ~15) — záznam si pamätáme 20 s namiesto dopytu pri každej.
    const user = await memo(`mobile-user:${decoded.userId}`, 20_000, async () => prisma.user.findUnique({ where: { id: decoded.userId } }));
    // Zmazaný účet sa odhlási zo všetkých zariadení (bezpečnosť, GDPR).
    if (!user || user.banned || (user as any).deleted) return null;
    // Neoverený nový účet sa do appky neprihlási (pozri /api/mobile/login).
    if ((user as any).mustVerifyEmail && !user.emailVerified) return null;
    // Po zmene hesla prestanú platiť všetky staršie prihlásenia.
    const changedAt = (user as any).passwordChangedAt ? new Date((user as any).passwordChangedAt).getTime() : 0;
    const issuedAt = ((decoded as any).iat || 0) * 1000;
    if (changedAt && issuedAt < changedAt - 1000) return null;
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
