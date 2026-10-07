import { prisma } from '../prisma';
import { sendOne } from './send';
import { verifyEmailTemplate, resetPasswordTemplate } from './templates';
import { randomToken, sha256, siteUrl } from './util';
import { hitSharedLimit } from '../sharedRateLimit';

// Strop e-mailov k účtu (overenie + reset hesla): max. 5 denne na jeden účet
// a celkovo 400 denne za celý web — chráni kvótu Resend a reputáciu domény
// pred „e-mailovým bombardovaním“ cudzej adresy.
const PER_ACCOUNT_DAILY = 5;
const GLOBAL_DAILY = 400;
const DAY_MS = 24 * 3_600_000;
async function accountMailAllowed(userId: string): Promise<boolean> {
  if (!(await hitSharedLimit(`mail:acct:${userId}`, DAY_MS, PER_ACCOUNT_DAILY))) return false;
  if (!(await hitSharedLimit('mail:global', DAY_MS, GLOBAL_DAILY))) {
    console.error('[email] Denný strop e-mailov k účtom bol dosiahnutý — ďalšie sa dnes neodošlú.');
    return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// E-maily k účtu: overenie adresy a obnovenie hesla.
// ---------------------------------------------------------------------------

export const VERIFY_VALID_HOURS = 48;
export const RESEND_COOLDOWN_SECONDS = 60;
const RESET_VALID_MINUTES = 60;

type Result = { ok: true } | { ok: false; reason: 'cooldown'; retryIn: number } | { ok: false; reason: 'failed' };

// Vygeneruje nový overovací odkaz a pošle ho. Odpočet 60 s proti zneužitiu.
export async function sendVerificationEmail(userId: string, opts: { ignoreCooldown?: boolean } = {}): Promise<Result> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, emailVerified: true, verificationSentAt: true, deleted: true }
  });
  if (!user || user.deleted || user.emailVerified) return { ok: true };
  if (!opts.ignoreCooldown && user.verificationSentAt) {
    const left = RESEND_COOLDOWN_SECONDS - Math.floor((Date.now() - user.verificationSentAt.getTime()) / 1000);
    if (left > 0) return { ok: false, reason: 'cooldown', retryIn: left };
  }
  const allowed = opts.ignoreCooldown
    ? await hitSharedLimit('mail:global', DAY_MS, GLOBAL_DAILY) // registrácia: len celkový strop
    : await accountMailAllowed(user.id);
  if (!allowed) return { ok: false, reason: 'cooldown', retryIn: 3600 };
  const token = randomToken();
  await prisma.user.update({ where: { id: user.id }, data: { verificationToken: token, verificationSentAt: new Date() } });
  const url = `${siteUrl()}/overit-email?token=${token}`;
  const ok = await sendOne({ to: user.email, ...verifyEmailTemplate(user.name, url) });
  return ok ? { ok: true } : { ok: false, reason: 'failed' };
}

// Overenie z odkazu v e-maile.
export async function verifyEmailToken(token: string): Promise<'ok' | 'already' | 'expired' | 'invalid'> {
  if (!token || typeof token !== 'string' || token.length > 200) return 'invalid';
  const user = await prisma.user.findUnique({
    where: { verificationToken: token },
    select: { id: true, emailVerified: true, verificationSentAt: true }
  });
  if (!user) return 'invalid';
  if (user.emailVerified) return 'already';
  if (user.verificationSentAt && Date.now() - user.verificationSentAt.getTime() > VERIFY_VALID_HOURS * 3_600_000) return 'expired';
  await prisma.user.update({ where: { id: user.id }, data: { emailVerified: true, verificationToken: null } });
  return 'ok';
}

// Žiadosť o obnovenie hesla. Navonok vždy „ok“ — nezradí, či e-mail existuje.
export async function requestPasswordReset(email: string) {
  const normalized = String(email || '').toLowerCase().trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) return;
  const user = await prisma.user.findUnique({
    where: { email: normalized },
    select: { id: true, name: true, email: true, deleted: true, banned: true, passwordResetSentAt: true }
  });
  if (!user || user.deleted || user.banned) return;
  if (user.passwordResetSentAt && Date.now() - user.passwordResetSentAt.getTime() < RESEND_COOLDOWN_SECONDS * 1000) return;
  if (!(await accountMailAllowed(user.id))) return;
  const token = randomToken();
  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordResetHash: sha256(token),
      passwordResetExpires: new Date(Date.now() + RESET_VALID_MINUTES * 60_000),
      passwordResetSentAt: new Date()
    }
  });
  await sendOne({ to: user.email, ...resetPasswordTemplate(user.name, `${siteUrl()}/nove-heslo?token=${token}`) });
}

// Platný odkaz na nové heslo → používateľ, inak null.
export async function findResetUser(token: string) {
  if (!token || typeof token !== 'string' || token.length > 200) return null;
  const user = await prisma.user.findUnique({
    where: { passwordResetHash: sha256(token) },
    select: { id: true, name: true, passwordResetExpires: true, deleted: true, banned: true }
  });
  if (!user || user.deleted || user.banned || !user.passwordResetExpires || user.passwordResetExpires < new Date()) return null;
  return user;
}
