import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { prisma } from './prisma';

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
        password: { label: 'Heslo', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.nickname || !credentials?.password) return null;

        const user = await prisma.user.findFirst({
          where: { name: { equals: credentials.nickname.trim(), mode: 'insensitive' } }
        });
        if (!user) return null;

        if (user.lockedUntil && user.lockedUntil > new Date()) {
          throw new Error('LOCKED');
        }

        const valid = await bcrypt.compare(credentials.password, user.passwordHash);

        if (!valid) {
          const attempts = user.failedLoginAttempts + 1;
          const LOCK_THRESHOLD = 5;
          const LOCK_MINUTES = 15;
          await prisma.user.update({
            where: { id: user.id },
            data: {
              failedLoginAttempts: attempts >= LOCK_THRESHOLD ? 0 : attempts,
              lockedUntil: attempts >= LOCK_THRESHOLD ? new Date(Date.now() + LOCK_MINUTES * 60_000) : null
            }
          });
          return null;
        }

        if (user.failedLoginAttempts > 0 || user.lockedUntil) {
          await prisma.user.update({
            where: { id: user.id },
            data: { failedLoginAttempts: 0, lockedUntil: null }
          });
        }

        if (user.banned) {
          throw new Error('BANNED');
        }

        if (!user.emailVerified) {
          throw new Error('UNVERIFIED');
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role
        } as any;
      }
    })
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = (user as any).id;
        token.role = (user as any).role;
      } else if (token.id) {
        // Obnov rolu a stav zablokovania z databázy pri každom overení,
        // nech sa zmena (napr. odobratie admin práv alebo zablokovanie) prejaví okamžite,
        // nie až po opätovnom prihlásení.
        const fresh = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { role: true, banned: true }
        });
        if (!fresh || fresh.banned) {
          token.invalid = true;
        } else {
          token.role = fresh.role;
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
      }
      return session;
    }
  },
  secret: process.env.NEXTAUTH_SECRET
};
