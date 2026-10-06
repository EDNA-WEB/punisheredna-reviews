import { prisma } from '../prisma';
import { maskEmail } from './util';
import { sendVerificationEmail } from './account';

// Nastavenie e-mailových oznámení prihláseného (web aj appka).
export async function getEmailPreferences(userId: string) {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, emailVerified: true, emailNews: true, emailOnline: true, emailMessages: true }
  });
  if (!u) return null;
  return {
    email: maskEmail(u.email),
    emailVerified: u.emailVerified,
    news: u.emailNews,
    online: u.emailOnline,
    messages: u.emailMessages
  };
}

export async function updateEmailPreferences(userId: string, body: any) {
  const data: { emailNews?: boolean; emailOnline?: boolean; emailMessages?: boolean } = {};
  if (typeof body?.news === 'boolean') data.emailNews = body.news;
  if (typeof body?.online === 'boolean') data.emailOnline = body.online;
  if (typeof body?.messages === 'boolean') data.emailMessages = body.messages;
  if (Object.keys(data).length) await prisma.user.update({ where: { id: userId }, data });
  return getEmailPreferences(userId);
}

// Overovací e-mail na vlastnú adresu (pre staršie, ešte neoverené účty).
export async function sendMyVerification(userId: string) {
  return sendVerificationEmail(userId);
}
