import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: SendEmailOptions) {
  try {
    const data = await resend.emails.send({
      from: 'KrálFilmu <noreply@kralfilmu.cz>',
      to: [to],
      subject,
      html,
    });

    return { success: true, data };
  } catch (error) {
    console.error('Chyba pri odosielaní e-mailu cez Resend:', error);
    return { success: false, error };
  }
}