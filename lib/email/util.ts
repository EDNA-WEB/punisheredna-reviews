import crypto from 'crypto';
import { purposeSecret, verifyKeys } from '../secrets';

// Verejná adresa webu pre odkazy v e-mailoch.
export function siteUrl() {
  return (process.env.PUBLIC_SITE_URL || process.env.NEXTAUTH_URL || 'https://kralfilmu.cz').replace(/\/$/, '');
}

export function escapeHtml(s: string) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// "matus.novak@gmail.com" → "m•••••@gmail.com"
export function maskEmail(email: string) {
  const [name, domain] = String(email || '').split('@');
  if (!domain) return '';
  return `${name.slice(0, 1)}•••••@${domain}`;
}

export const sha256 = (s: string) => crypto.createHash('sha256').update(s).digest('hex');
export const randomToken = () => crypto.randomBytes(32).toString('hex');

// --- Odhlásenie odberu jedným klikom (bez prihlásenia) ---------------------
export type EmailTopic = 'news' | 'online' | 'messages' | 'all';
export const TOPICS: EmailTopic[] = ['news', 'online', 'messages', 'all'];

// Vlastný kľúč (lib/secrets.ts) — bez verejne známej náhrady, inak by sa dali
// podvrhnúť odkazy na odhlásenie odberu pre kohokoľvek.
function unsubSig(userId: string, topic: EmailTopic, key: string = purposeSecret('unsubscribe')) {
  return crypto.createHmac('sha256', key).update(`unsub:${userId}:${topic}`).digest('base64url').slice(0, 32);
}

export function unsubscribeUrl(userId: string, topic: EmailTopic) {
  return `${siteUrl()}/odhlasit-odber?u=${encodeURIComponent(userId)}&t=${topic}&s=${unsubSig(userId, topic)}`;
}

export function unsubscribeApiUrl(userId: string, topic: EmailTopic) {
  return `${siteUrl()}/api/email/unsubscribe?u=${encodeURIComponent(userId)}&t=${topic}&s=${unsubSig(userId, topic)}`;
}

export function verifyUnsubscribe(userId: string, topic: string, sig: string) {
  if (!userId || !sig || !TOPICS.includes(topic as EmailTopic)) return false;
  for (const k of verifyKeys('unsubscribe')) {
    const expected = unsubSig(userId, topic as EmailTopic, k);
    if (expected.length === sig.length && crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig))) return true;
  }
  return false;
}
