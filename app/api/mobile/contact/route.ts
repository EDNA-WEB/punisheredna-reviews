import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getMobileUser } from '@/lib/mobileAuth';
import { looksLikeSpam } from '@/lib/antiSpam';
import { checkKeyRateLimit } from '@/lib/ipRateLimit';

export const dynamic = 'force-dynamic';

// Rovnaká logika ako web (/api/contact) — správa ide adminovi ako bežná
// súkromná správa, max. 2 za hodinu.
export async function POST(req: Request) {
  try {
    const authUser = await getMobileUser(req);
    if (!authUser) return NextResponse.json({ error: 'Neplatné nebo vypršelé přihlášení.' }, { status: 401 });

    const sender = await prisma.user.findUnique({ where: { id: authUser.id } });
    if (!sender || sender.banned) return NextResponse.json({ error: 'Tvůj účet byl zablokován.' }, { status: 403 });

    const { body } = await req.json();
    if (!body || !String(body).trim()) return NextResponse.json({ error: 'Zpráva nemůže být prázdná.' }, { status: 400 });
    if (String(body).length > 3000) return NextResponse.json({ error: 'Zpráva je příliš dlouhá (max. 3000 znaků).' }, { status: 400 });

    const spamReason = looksLikeSpam(String(body));
    if (spamReason) return NextResponse.json({ error: spamReason }, { status: 400 });

    if (!checkKeyRateLimit(`contact-form:${sender.id}`, 60 * 60_000, 2)) {
      return NextResponse.json({ error: 'Přes tento formulář můžeš poslat nejvýše 2 zprávy za hodinu. Zkus to prosím později.' }, { status: 429 });
    }

    const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
    if (!admin) return NextResponse.json({ error: 'Příjemce se nepodařilo najít.' }, { status: 500 });

    await prisma.message.create({ data: { senderId: sender.id, receiverId: admin.id, body: String(body).trim() } });

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    console.error('[api/mobile/contact]', error);
    return NextResponse.json({ error: 'Odeslání se nezdařilo. Zkus to prosím znovu.' }, { status: 400 });
  }
}
