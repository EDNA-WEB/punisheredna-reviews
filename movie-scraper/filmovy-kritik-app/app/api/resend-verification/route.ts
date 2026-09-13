import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/resend';

export async function POST(req: Request) {
  const { nickname } = await req.json();
  if (!nickname) return NextResponse.json({ error: 'Chýba prezývka.' }, { status: 400 });

  const user = await prisma.user.findFirst({ where: { name: { equals: String(nickname).trim(), mode: 'insensitive' } } });
  // Zámerne nehlásime, či prezývka existuje alebo nie — nech to nie je zneužiteľné
  // na zisťovanie, kto je u nás registrovaný.
  if (!user || user.emailVerified) {
    return NextResponse.json({ ok: true });
  }

  const verificationToken = crypto.randomBytes(32).toString('hex');
  await prisma.user.update({ where: { id: user.id }, data: { verificationToken } });

  const verifyUrl = `${process.env.NEXTAUTH_URL}/overit-email?token=${verificationToken}`;
  await sendEmail({
    to: user.email,
    subject: 'Potvrď svoj e-mail — PunisherEDNA reviews',
    html: `
      <p>Ahoj ${user.name},</p>
      <p>tu je nový odkaz na potvrdenie tvojej e-mailovej adresy:</p>
      <p><a href="${verifyUrl}">${verifyUrl}</a></p>
    `
  }).catch((err) => console.error('sendEmail (opätovné odoslanie)', err));

  return NextResponse.json({ ok: true });
}
