import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateCaptchaCode, generateCaptchaSvg } from '@/lib/captcha';
import { checkIpRateLimit } from '@/lib/ipRateLimit';

export async function GET(req: Request) {
  if (!checkIpRateLimit(req, 'captcha', 60_000, 20)) {
    return NextResponse.json({ error: 'Príliš veľa požiadaviek.' }, { status: 429 });
  }

  // Priebežné upratovanie starých/nepoužitých výziev (staršie ako 15 minút)
  const fifteenMinAgo = new Date(Date.now() - 15 * 60 * 1000);
  prisma.captchaChallenge.deleteMany({ where: { createdAt: { lt: fifteenMinAgo } } }).catch(() => {});

  const code = generateCaptchaCode();
  const challenge = await prisma.captchaChallenge.create({ data: { code } });
  const svg = generateCaptchaSvg(code);

  return NextResponse.json({ token: challenge.id, svg });
}
