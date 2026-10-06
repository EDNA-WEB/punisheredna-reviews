import { sendOne } from './email/send';

// Spätná kompatibilita — nové e-maily používajú lib/email/*.
export async function sendEmail({ to, subject, html }: { to: string; subject: string; html: string }) {
  const ok = await sendOne({ to, subject, html });
  return ok ? { success: true } : { success: false, error: 'send-failed' };
}
