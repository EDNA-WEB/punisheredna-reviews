import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { looksLikeSpam } from '@/lib/antiSpam';
import { checkKeyRateLimit } from '@/lib/ipRateLimit';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Musíš byť prihlásený.' }, { status: 401 });

    const senderId = (session.user as any).id;
    const sender = await prisma.user.findUnique({ where: { id: senderId } });
    if (!sender || sender.banned) {
      return NextResponse.json({ error: 'Tvůj účet byl zablokován.' }, { status: 403 });
    }

    const { body } = await req.json();
    if (!body || !String(body).trim()) {
      return NextResponse.json({ error: 'Zpráva nemůže být prázdná.' }, { status: 400 });
    }
    if (String(body).length > 3000) {
      return NextResponse.json({ error: 'Zpráva je příliš dlouhá (max. 3000 znaků).' }, { status: 400 });
    }
    const spamReason = looksLikeSpam(String(body));
    if (spamReason) return NextResponse.json({ error: spamReason }, { status: 400 });

    // Vlastný, prísnejší limit len pre tento formulár: max. 2 správy za hodinu.
    if (!checkKeyRateLimit(`contact-form:${senderId}`, 60 * 60_000, 2)) {
      return NextResponse.json(
        { error: 'Přes tento formulář můžeš poslat nejvýše 2 zprávy za hodinu. Zkus to prosím později.' },
        { status: 429 }
      );
    }

    const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
    if (!admin) return NextResponse.json({ error: 'Příjemce se nepodařilo najít.' }, { status: 500 });

    await prisma.message.create({
      data: { senderId, receiverId: admin.id, body: String(body).trim() }
    });

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: 'Požadavek selhal. Zkus to prosím znovu.' }, { status: 400 });
  }
}
