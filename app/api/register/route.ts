import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { validatePassword, validateNickname } from '@/lib/passwordRules';
import { verifyCaptcha } from '@/lib/captcha';
import { issueRecoveryCode } from '@/lib/recoveryCode';
import { issueTrialCode } from '@/lib/membership';

export async function POST(req: Request) {
  try {
    const settings = await prisma.settings.findUnique({ where: { id: 'singleton' }, select: { registrationsEnabled: true } });
    if (settings && settings.registrationsEnabled === false) {
      return NextResponse.json({ error: 'Registrácie sú momentálne pozastavené. Skús to prosím neskôr.' }, { status: 403 });
    }

    const { nickname, email, password, website, elapsedMs, captchaToken, captchaAnswer } = await req.json();

    // Honeypot: skryté pole, ktoré človek nikdy nevyplní, ale jednoduché boty áno.
    if (website) {
      return NextResponse.json({ ok: true });
    }

    // Časová pasca: človek potrebuje na vyplnenie formulára aspoň pár sekúnd.
    // Odoslanie za menej ako sekundu od načítania stránky je takmer vždy bot.
    if (typeof elapsedMs === 'number' && elapsedMs < 1000) {
      return NextResponse.json({ ok: true });
    }

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

    // Verejná registrácia vytvára vždy len čitateľský účet — administrátorov
    // možno vytvoriť len cez "npx prisma db seed" alebo priamo v databáze.
    const user = await prisma.user.create({
      data: { name: trimmedNickname, email: normalizedEmail, passwordHash, role: 'READER' }
    });

    await issueRecoveryCode(user.id).catch((err) => console.error('issueRecoveryCode', err));
    await issueTrialCode(user.id).catch((err) => console.error('issueTrialCode', err));

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    if (err?.code === 'P2002') {
      // Dvaja ľudia sa pokúsili zaregistrovať s rovnakou prezývkou/e-mailom v tom istom okamihu.
      return NextResponse.json(
        { error: 'Táto prezývka alebo e-mail sa medzitým už použili. Skús to prosím s inými údajmi.' },
        { status: 409 }
      );
    }
    console.error(err);
    return NextResponse.json({ error: 'Registrácia zlyhala. Skús to prosím znova.' }, { status: 500 });
  }
}
