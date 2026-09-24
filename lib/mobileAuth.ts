import jwt from 'jsonwebtoken';
import { prisma } from './prisma';

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
    const decoded = jwt.verify(token, SECRET) as MobileTokenPayload;
    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
    if (!user || user.banned) return null;
    return user;
  } catch {
    return null;
  }
}
