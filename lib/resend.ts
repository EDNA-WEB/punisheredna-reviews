// Jednoduché odoslanie e-mailu cez Resend API — priamym fetch() volaním,
// bez potreby inštalovať ich npm balíček.
export async function sendEmail({ to, subject, html }: { to: string; subject: string; html: string }) {
  if (!process.env.RESEND_API_KEY) {
    console.error('RESEND_API_KEY nie je nastavený — e-mail sa neodoslal.');
    return false;
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL || 'PunisherEDNA reviews <onboarding@resend.dev>',
        to: [to],
        subject,
        html
      })
    });
    return res.ok;
  } catch (err) {
    console.error('Odoslanie e-mailu zlyhalo:', err);
    return false;
  }
}
