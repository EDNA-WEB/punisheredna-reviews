// /.well-known/security.txt (RFC 9116) — kde nahlásiť bezpečnostnú chybu.
// Kontakt nastav v premennej SECURITY_CONTACT (napr. "mailto:bezpecnost@kralfilmu.cz").
export const dynamic = 'force-dynamic';

export async function GET() {
  const site = (process.env.NEXTAUTH_URL || '').replace(/\/$/, '');
  const contact = process.env.SECURITY_CONTACT || (process.env.RESEND_FROM_EMAIL?.match(/<([^>]+)>/)?.[1] ? `mailto:${process.env.RESEND_FROM_EMAIL.match(/<([^>]+)>/)![1]}` : `${site}/login`);
  const expires = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
  const body = [
    `Contact: ${contact}`,
    `Expires: ${expires}`,
    `Preferred-Languages: cs, sk, en`,
    site ? `Canonical: ${site}/.well-known/security.txt` : ''
  ]
    .filter(Boolean)
    .join('\n');
  return new Response(body + '\n', { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=86400' } });
}
