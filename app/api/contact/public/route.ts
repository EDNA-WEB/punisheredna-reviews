import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyCaptcha } from '@/lib/captcha';
import { looksLikeSpam } from '@/lib/antiSpam';
import { hitSharedLimit } from '@/lib/sharedRateLimit';
import { ipFromHeaders } from '@/lib/security/clientInfo';
import { getOrCreateSystemAccount } from '@/lib/recoveryCode';
import { encryptMessageBody } from '@/lib/serverCrypto';

export const dynamic = 'force-dynamic';

// Kontakt aj bez prihlásenia (stránka /provozovatel): správa príde adminovi
// do Pošty od technického účtu „Systém“ spolu s menom a e-mailom odosielateľa.
export async function POST(req: Request) {
  try {
    const ip = ipFromHeaders(req.headers) || 'unknown';
    // Volnejší limit pokusov (aj chybných) — proti hádaniu captchy.
    if (!(await hitSharedLimit(`contact-public-try:${ip}`, 3_600_000, 15))) {
      return NextResponse.json({ error: 'Příliš mnoho pokusů. Zkus to prosím za hodinu.' }, { status: 429 });
    }
    const body = await req.json().catch(() => ({}));
    if (body?.website) return NextResponse.json({ ok: true }); // pasca na boty

    const name = typeof body?.name === 'string' ? body.name.trim().slice(0, 80) : '';
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase().slice(0, 200) : '';
    const message = typeof body?.message === 'string' ? body.message.trim() : '';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: 'Zadej platný e-mail pro odpověď.' }, { status: 400 });
    if (!message) return NextResponse.json({ error: 'Zpráva nemůže být prázdná.' }, { status: 400 });
    if (message.length > 3000) return NextResponse.json({ error: 'Zpráva je příliš dlouhá (max. 3000 znaků).' }, { status: 400 });

    const captchaError = await verifyCaptcha(body?.captchaToken, body?.captchaAnswer);
    if (captchaError) return NextResponse.json({ error: captchaError }, { status: 400 });
    const spam = looksLikeSpam(message);
    if (spam) return NextResponse.json({ error: spam }, { status: 400 });

    // Prísny limit len pre skutočne odoslané správy: 3 za hodinu z jedného pripojenia.
    if (!(await hitSharedLimit(`contact-public:${ip}`, 3_600_000, 3))) {
      return NextResponse.json({ error: 'Z tohoto připojení lze poslat nejvýše 3 zprávy za hodinu.' }, { status: 429 });
    }

    const admin = await prisma.user.findFirst({ where: { role: 'ADMIN', deleted: false }, orderBy: { createdAt: 'asc' }, select: { id: true } });
    if (!admin) return NextResponse.json({ error: 'Příjemce se nepodařilo najít.' }, { status: 500 });
    const system = await getOrCreateSystemAccount();

    // Uložené zašifrované, rovnako ako bežné správy.
    const { ciphertext, iv } = encryptMessageBody(`Zpráva z kontaktního formuláře (bez přihlášení)\nOd: ${name || '—'} <${email}>\n\n${message}`);
    await prisma.message.create({ data: { senderId: system.id, receiverId: admin.id, body: ciphertext, iv } });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    console.error('[contact/public]', err);
    return NextResponse.json({ error: 'Odeslání se nezdařilo. Zkus to prosím znovu.' }, { status: 400 });
  }
}
