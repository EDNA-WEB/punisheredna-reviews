import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { validatePassword, validateNickname } from '@/lib/passwordRules';
import { verifyCaptcha } from '@/lib/captcha';
import { issueRecoveryCode } from '@/lib/recoveryCode';
import { signMobileToken } from '@/lib/mobileAuth';

// Rovnaká logika ako webová registrácia (app/api/register) — appka navyše
// po úspešnej registrácii rovno dostane prihlasovací token, nech sa
// používateľ nemusí ešte raz prihlasovať zvlášť.
export async function POST(req: Request) {
  try {
    const settings = await prisma.settings.findUnique({ where: { id: 'singleton' }, select: { registrationsEnabled: true } });
    if (settings && settings.registrationsEnabled === false) {
      return NextResponse.json({ error: 'Registrácie sú momentálne pozastavené. Skús to prosím neskôr.' }, { status: 403 });
    }

    const { nickname, email, password, captchaToken, captchaAnswer } = await req.json();

    const captchaError = await verifyCaptcha(captchaToken, captchaAnswer);
    if (captchaError) {
      return NextResponse.json({ error: captchaError }, { status: 400 });
    }

    if (!nickname || !email || !password) {
      return NextResponse.json({ error: 'Vyplň prosím prezývku, e-mail aj heslo.' }, { status: 400 });
    }

    const trimmedNickname = String(nickname).trim();
    const nicknameError = validateNickname(trimmedNickname);
    if (nicknameError) {
      return NextResponse.json({ error: nicknameError }, { status: 400 });
    }

    const passwordError = validatePassword(String(password));
    if (passwordError) {
      return NextResponse.json({ error: passwordError }, { status: 400 });
    }

    const normalizedEmail = String(email).toLowerCase().trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return NextResponse.json({ error: 'Zadaj platnú e-mailovú adresu.' }, { status: 400 });
    }

    const [existingEmail, existingNickname] = await Promise.all([
      prisma.user.findUnique({ where: { email: normalizedEmail } }),
      prisma.user.findUnique({ where: { name: trimmedNickname } })
    ]);
    if (existingEmail) {
      return NextResponse.json({ error: 'Účet s týmto e-mailom už existuje.' }, { status: 409 });
    }
    if (existingNickname) {
      return NextResponse.json({ error: 'Táto prezývka je už obsadená, skús inú.' }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const verificationToken = crypto.randomBytes(32).toString('hex');

    const user = await prisma.user.create({
      data: { name: trimmedNickname, email: normalizedEmail, passwordHash, role: 'READER', emailVerified: false, verificationToken }
    });

    await issueRecoveryCode(user.id).catch((err) => console.error('issueRecoveryCode', err));

    const token = signMobileToken({ userId: user.id, name: user.name, role: user.role });
    return NextResponse.json({
      token,
      user: { id: user.id, name: user.name, role: user.role, avatar: user.avatar }
    });
  } catch (error) {
    console.error('[mobile/register]', error);
    return NextResponse.json({ error: 'Registrácia zlyhala. Skús to prosím znova.' }, { status: 500 });
  }
}
