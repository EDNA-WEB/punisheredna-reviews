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
      return NextResponse.json({ error: 'Tvoj účet bol zablokovaný.' }, { status: 403 });
    }

    const { body } = await req.json();
    if (!body || !String(body).trim()) {
      return NextResponse.json({ error: 'Správa nemôže byť prázdna.' }, { status: 400 });
    }
    if (String(body).length > 3000) {
      return NextResponse.json({ error: 'Správa je príliš dlhá (max. 3000 znakov).' }, { status: 400 });
    }
    const spamReason = looksLikeSpam(String(body));
    if (spamReason) return NextResponse.json({ error: spamReason }, { status: 400 });

    // Vlastný, prísnejší limit len pre tento formulár: max. 2 správy za hodinu.
    if (!checkKeyRateLimit(`contact-form:${senderId}`, 60 * 60_000, 2)) {
      return NextResponse.json(
        { error: 'Cez tento formulár môžeš poslať najviac 2 správy za hodinu. Skús to prosím neskôr.' },
        { status: 429 }
      );
    }

    const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
    if (!admin) return NextResponse.json({ error: 'Príjemcu sa nepodarilo nájsť.' }, { status: 500 });

    await prisma.message.create({
      data: { senderId, receiverId: admin.id, body: String(body).trim() }
    });

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: 'Požiadavka zlyhala. Skús to prosím znova.' }, { status: 400 });
  }
}
