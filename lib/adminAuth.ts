import { headers } from 'next/headers';
import { getServerSession } from 'next-auth';
import { authOptions } from './auth';
import { getMobileUser } from './mobileAuth';

// Prihlásenie z webu (cookie NextAuth) ALEBO z mobilnej appky (Bearer token).
// Vďaka tomu môžu admin akcie (schválenie filmu, návrhy obsahu, nahlásenia,
// blokovanie, novinky) používať web aj natívna administrácia v appke —
// s ROVNAKOU logikou (notifikácie autorom, audit log…), bez duplikovania.
// Vracia objekt v tvare session z NextAuth, takže existujúci kód sa nemení.
export async function getSessionOrMobile(): Promise<any | null> {
  const session = await getServerSession(authOptions);
  if (session) return session; // admin práva mimo povolených IP odoberá už lib/auth.ts
  const h = await headers();
  const auth = h.get('authorization');
  if (!auth || !auth.startsWith('Bearer ')) return null;
  // Pôvodné hlavičky (vrátane IP) — kvôli obmedzeniu admin práv na povolené IP.
  const forwarded = new Headers({ authorization: auth });
  for (const name of ['x-vercel-forwarded-for', 'x-forwarded-for', 'x-real-ip']) {
    const v = h.get(name);
    if (v) forwarded.set(name, v);
  }
  const user = await getMobileUser(new Request('https://appka.local', { headers: forwarded }));
  if (!user || user.banned) return null;
  return { user: { id: user.id, name: user.name, email: user.email, role: user.role, isEditor: !!(user as any).isEditor } };
}

// Pre nové mobilné admin API: len admin (redaktor len kde je to výslovne povolené).
export async function requireMobileAdmin(req: Request, allowEditor = false) {
  const user = await getMobileUser(req);
  if (!user || user.banned) return null;
  if (user.role === 'ADMIN') return user;
  if (allowEditor && (user as any).isEditor) return user;
  return null;
}
