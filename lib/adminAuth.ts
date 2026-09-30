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
  if (session) return session;
  const auth = (await headers()).get('authorization');
  if (!auth || !auth.startsWith('Bearer ')) return null;
  const user = await getMobileUser(new Request('https://appka.local', { headers: { authorization: auth } }));
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
