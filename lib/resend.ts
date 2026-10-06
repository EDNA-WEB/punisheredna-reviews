import { sendOne } from './email/send';

// Spätná kompatibilita — nové e-maily používajú lib/email/*.
export async function sendEmail({ to, subject, html }: { to: string; subject: string; html: string }) {
  return sendOne({ to, subject, html });
}
