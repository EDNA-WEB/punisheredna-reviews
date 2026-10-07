import { NextResponse } from 'next/server';
import { hitSharedLimit } from '@/lib/sharedRateLimit';
import { ipFromHeaders } from '@/lib/security/clientInfo';
import { prisma } from '@/lib/prisma';
import { sendVerificationEmail } from '@/lib/email/account';

export const dynamic = 'force-dynamic';

// Opätovné poslanie overovacieho e-mailu. Prijme prezývku, e-mail alebo
// starý (prepadnutý) token z odkazu. Navonok nikdy neprezradí, či účet existuje.
export async function POST(req: Request) {
  // Max. 10 žiadostí za hodinu z jednej IP adresy (spoločné pre všetky servery).
  const ip = ipFromHeaders(req.headers) || 'unknown';
  if (!(await hitSharedLimit(`mail-resend:ip:${ip}`, 3_600_000, 10))) {
    return NextResponse.json({ error: 'Příliš mnoho pokusů. Zkuste to znovu za hodinu.' }, { status: 429 });
  }
  const body = await req.json().catch(() => ({}));
  const nickname = typeof body?.nickname === 'string' ? body.nickname.trim().slice(0, 60) : '';
  const email = typeof body?.email === 'string' ? body.email.toLowerCase().trim().slice(0, 200) : '';
  const token = typeof body?.token === 'string' ? body.token.slice(0, 200) : '';
  if (!nickname && !email && !token) return NextResponse.json({ error: 'Chybí údaje.' }, { status: 400 });

  const user = token
    ? await prisma.user.findUnique({ where: { verificationToken: token }, select: { id: true } })
    : email
      ? await prisma.user.findUnique({ where: { email }, select: { id: true } })
      : await prisma.user.findFirst({ where: { name: { equals: nickname, mode: 'insensitive' } }, select: { id: true } });

  if (user) {
    const r = await sendVerificationEmail(user.id);
    if (!r.ok && r.reason === 'cooldown') {
      return NextResponse.json({ error: `Odkaz půjde poslat znovu za ${r.retryIn} s.`, retryIn: r.retryIn }, { status: 429 });
    }
  }
  return NextResponse.json({ ok: true });
}
