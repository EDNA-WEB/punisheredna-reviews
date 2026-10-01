import { getServerSession } from 'next-auth';
import { authOptions } from './auth';
import { getMobileUser } from './mobileAuth';
import { isActiveMember } from './membership';

// Kto sa pýta filtra (appka cez token, web cez prihlásenie) a či je člen.
export async function filterViewer(req: Request): Promise<{ userId: string | null; isMember: boolean }> {
  let userId: string | null = null;
  let role: string | null = null;
  try {
    if (req.headers.get('authorization')) {
      const u: any = await getMobileUser(req);
      if (u) {
        userId = u.id;
        role = u.role || null;
      }
    }
    if (!userId) {
      const session = await getServerSession(authOptions);
      const su: any = session?.user;
      if (su?.id) {
        userId = su.id;
        role = su.role || null;
      }
    }
  } catch {
    /* anonym */
  }
  const isMember = role === 'ADMIN' || (userId ? await isActiveMember(userId) : false);
  return { userId, isMember };
}
