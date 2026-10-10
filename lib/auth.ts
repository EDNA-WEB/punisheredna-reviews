import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { prisma } from './prisma';
import { memoForget } from './memoCache';
import { recordActivity } from './security/activityLog';
import { ipFromHeaders, currentHeaders } from './security/clientInfo';
import { adminIpAllowed } from './adminIp';
import { loginAttemptAllowed, registerFailedLogin, clearFailedLogins } from './loginGuard';
import { verifySecondFactor, twoFactorRequiredFor } from './twoFactor';

type FreshUserState = { role: any; banned: boolean; deleted: boolean; membershipUntil: Date | null; isEditor: boolean; passwordChangedAt: Date | null; twoFactorEnabledAt: Date | null } | null;
const FRESH_TTL_MS = 30_000;
const freshCache: Map<string, { at: number; value: FreshUserState }> =
  (globalThis as any).__authFreshCache || ((globalThis as any).__authFreshCache = new Map());

async function getFreshUserState(userId: string): Promise<FreshUserState> {
  const hit = freshCache.get(userId);
  if (hit && Date.now() - hit.at < FRESH_TTL_MS) return hit.value;
  const value = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, banned: true, deleted: true, membershipUntil: true, isEditor: true, passwordChangedAt: true, twoFactorEnabledAt: true }
  });
  freshCache.set(userId, { at: Date.now(), value });
  if (freshCache.size > 5000) freshCache.clear(); // poistka proti rastu pamäte
  return value;
}

// Po zmene hesla / zmazaní účtu zabudneme uložený stav hneď (na tejto
// inštancii servera), nech odhlásenie nečaká na 30-sekundovú pamäť.
export function forgetUserSessionCache(userId: string) {
  freshCache.delete(userId);
  memoForget(`mobile-user:${userId}`);
}

export const authOptions: NextAuthOptions = {
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/login'
  },
  providers: [
    CredentialsProvider({
      name: 'Prihlásenie',
      credentials: {
        nickname: { label: 'Prezývka', type: 'text' },
        password: { label: 'Heslo', type: 'password' },
        rememberMe: { label: 'Zapamatovat si mě', type: 'text' },
        qrToken: { label: 'QR prihlásenie', type: 'text' },
        otp: { label: 'Kód z aplikácie', type: 'text' }
      },
      async authorize(credentials, req) {
        // Prihlasovacie údaje môžu prísť aj ako JSON — povolíme len obyčajný text,
        // aby sa do dopytu nedal podstrčiť objekt (napr. qrToken: { not: '' }).
        if (credentials && Object.values(credentials).some((v) => v !== undefined && v !== null && typeof v !== 'string')) return null;
        // Prihlásenie cez QR kód — namiesto prezývky/hesla len id už POTVRDENEJ
        // QR relácie (potvrdenie prebehlo na mobile, viď /api/qr-login/approve).
        if (credentials?.qrToken) {
          // Atomická zmena "approved" → "expired" — ak by (v nepravdepodobnom
          // prípade) prišli dva pokusy o prihlásenie tým istým QR kódom takmer
          // súčasne, len JEDEN z nich uspeje (WHERE nižšie sa vyhodnotí na
          // úrovni databázy, nie v dvoch oddelených krokoch).
          const { count } = await prisma.qrLoginSession.updateMany({
            where: { id: credentials.qrToken, status: 'approved' },
            data: { status: 'expired' }
          });
          if (count === 0) return null;

          const qrSession = await prisma.qrLoginSession.findUnique({ where: { id: credentials.qrToken } });
          if (!qrSession?.userId) return null;
          const user = await prisma.user.findUnique({ where: { id: qrSession.userId } });
          if (!user || user.banned) return null;
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            membershipUntil: user.membershipUntil,
            isEditor: user.isEditor,
            twoFactor: !!user.twoFactorEnabledAt,
            rememberMe: true
          } as any;
        }

        if (!credentials?.nickname || !credentials?.password) return null;

        // Limit pokusov na IP aj prezývku ešte pred porovnaním hesla.
        const rawHeaders = ((req as any)?.headers || {}) as Record<string, string | string[] | undefined>;
        const ip = ipFromHeaders({
          get: (n: string) => {
            const v = rawHeaders[n] ?? rawHeaders[n.toLowerCase()];
            return Array.isArray(v) ? v[0] ?? null : v ?? null;
          }
        });
        if (!(await loginAttemptAllowed(ip, credentials.nickname))) throw new Error('LOCKED');

        const user = await prisma.user.findFirst({
          where: { name: { equals: credentials.nickname.trim(), mode: 'insensitive' } }
        });
        if (!user) return null;

        if (user.lockedUntil && user.lockedUntil > new Date()) {
          throw new Error('LOCKED');
        }

        const valid = await bcrypt.compare(credentials.password, user.passwordHash);

        if (!valid) {
          await registerFailedLogin(user.id);
          return null;
        }

        // Dvojfaktorové overenie: po správnom hesle ešte kód z aplikácie
        // (alebo záložný kód). Nesprávny kód sa počíta ako nesprávne heslo.
        if (user.twoFactorEnabledAt) {
          if (!credentials.otp) throw new Error('TWO_FACTOR_REQUIRED');
          if (!(await verifySecondFactor(user.id, credentials.otp))) {
            await registerFailedLogin(user.id);
            throw new Error('TWO_FACTOR_INVALID');
          }
        }

        await clearFailedLogins(user);

        if (user.banned) {
          throw new Error('BANNED');
        }

        // Nové účty (od zapnutia e-mailov) sa prihlásia až po overení e-mailu.
        // Staršie účty majú mustVerifyEmail = false a fungujú ďalej bez zmeny.
        if (user.mustVerifyEmail && !user.emailVerified) {
          throw new Error('UNVERIFIED');
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          membershipUntil: user.membershipUntil,
          isEditor: user.isEditor,
          twoFactor: !!user.twoFactorEnabledAt,
          rememberMe: credentials.rememberMe === 'true'
        } as any;
      }
    })
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = (user as any).id;
        token.role = (user as any).role;
        token.membershipUntil = (user as any).membershipUntil || null;
        token.isEditor = (user as any).isEditor || false;
        token.twoFactor = !!(user as any).twoFactor;
        token.authAt = Date.now();
        await recordActivity(String(token.id), 'login');
        // "Zapamätať si ma" — zaškrtnuté: prihlásenie vydrží 10 dní, aj keď
        // používateľ medzitým zavrie prehliadač. Nezaškrtnuté: len 1 deň.
        const rememberDays = (user as any).rememberMe ? 10 : 1;
        token.exp = Math.floor(Date.now() / 1000) + rememberDays * 24 * 60 * 60;
        // NextAuth pri každom obnovení prepíše „exp“ na 30 dní — preto si koniec
        // prihlásenia ukladáme zvlášť a kontrolujeme ho nižšie.
        token.loginExpiresAt = Date.now() + rememberDays * 24 * 60 * 60 * 1000;
      } else if (token.id) {
        // Obnov rolu, stav zablokovania a členstvo z databázy pri každom overení,
        // nech sa zmena (napr. odobratie admin práv, zablokovanie, alebo uplatnenie
        // nového kódu členstva) prejaví okamžite, nie až po opätovnom prihlásení.
        //
        // Výkon: toto sa volá pri KAŽDOM overení prihlásenia (každá stránka aj
        // API), takže bez cache to bol jeden dopyt do databázy navyše pri
        // každej požiadavke. Výsledok si preto pamätáme 30 s — zablokovanie či
        // zmena práv sa prejaví najneskôr do pol minúty.
        const fresh = await getFreshUserState(token.id as string);
        // Po zmene hesla (napr. z odkazu v e-maile) sa odhlásia všetky staršie prihlásenia.
        const changedAt = fresh?.passwordChangedAt ? new Date(fresh.passwordChangedAt).getTime() : 0;
        // Prihlásenia spred tejto úpravy nemajú koniec uložený — dostanú 10 dní od teraz.
        if (!token.loginExpiresAt) token.loginExpiresAt = Date.now() + 10 * 24 * 60 * 60 * 1000;
        const loginExpired = Date.now() > Number(token.loginExpiresAt);
        if (!fresh || fresh.banned || fresh.deleted || loginExpired || (changedAt && Number(token.authAt || 0) < changedAt)) {
          token.invalid = true;
        } else {
          token.role = fresh.role;
          token.membershipUntil = fresh.membershipUntil;
          token.isEditor = fresh.isEditor;
          token.twoFactor = !!fresh.twoFactorEnabledAt;
          token.invalid = false;
        }
      }
      if (trigger === 'update' && session?.name) {
        token.name = session.name;
      }
      return token;
    },
    async session({ session, token }) {
      if (token.invalid) {
        // Neplatný alebo zablokovaný účet — vráť null, presne ako keby nebol
        // prihlásený vôbec. Všetky kontroly "if (!session)" naprieč webom
        // to takto vyhodnotia správne, namiesto pádu na session.user.id.
        return null as any;
      }
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
        (session.user as any).membershipUntil = token.membershipUntil || null;
        (session.user as any).isEditor = token.isEditor || false;
        // Admin a redaktor bez zapnutého dvojfaktorového overenia nemá zvláštne
        // práva, kým si ho nenastaví (Nastavenia → Zabezpečení).
        if (twoFactorRequiredFor({ role: token.role as string, isEditor: !!token.isEditor }) && !token.twoFactor) {
          (session.user as any).role = 'READER';
          (session.user as any).isEditor = false;
          (session.user as any).needsTwoFactorSetup = true;
        }
        // Mimo povolených IP adries (ADMIN_ALLOWED_IPS) nemá admin ani redaktor
        // žiadne zvláštne práva — ani v API mimo /api/admin.
        if ((token.role === 'ADMIN' || token.isEditor) && process.env.ADMIN_ALLOWED_IPS) {
          const h = await currentHeaders();
          if (h && !adminIpAllowed(h)) {
            (session.user as any).role = 'READER';
            (session.user as any).isEditor = false;
          }
        }
      }
      return session;
    }
  },
  secret: process.env.NEXTAUTH_SECRET
};
