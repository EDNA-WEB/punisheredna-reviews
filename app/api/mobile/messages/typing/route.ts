import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getMobileUser, touchLastActive } from '@/lib/mobileAuth';
import { isTypingTo, setTyping } from '@/lib/chatRealtime';

export const dynamic = 'force-dynamic';

// GET ?userId=  → píše mi práve tento používateľ? + kedy bol naposledy aktívny
export async function GET(req: Request) {
  try {
    const me = await getMobileUser(req);
    if (!me) return NextResponse.json({ error: 'Neplatné nebo vypršelé přihlášení.' }, { status: 401 });
    const otherId = new URL(req.url).searchParams.get('userId');
    if (!otherId) return NextResponse.json({ error: 'Chýba userId.' }, { status: 400 });

    // "version" = posledná správa v konverzácii + či je prečítaná. Appka podľa
    // nej načíta celé vlákno LEN keď sa niečo zmenilo (namiesto každé 4 s).
    const [typing, other, last] = await Promise.all([
      isTypingTo(otherId, me.id),
      prisma.user.findUnique({ where: { id: otherId }, select: { lastActiveAt: true } }),
      prisma.message.findFirst({
        where: { OR: [{ senderId: me.id, receiverId: otherId }, { senderId: otherId, receiverId: me.id }] },
        orderBy: { createdAt: 'desc' },
        select: { id: true, read: true }
      })
    ]);
    return NextResponse.json(
      { typing, lastActiveAt: other?.lastActiveAt || null, version: last ? `${last.id}:${last.read ? 1 : 0}` : 'none' },
      { status: 200 }
    );
  } catch (error) {
    console.error('[api/mobile/messages/typing GET]', error);
    return NextResponse.json({ typing: false }, { status: 200 });
  }
}

// POST { userId, typing } — ja práve píšem (true) / prestal som (false)
export async function POST(req: Request) {
  try {
    const me = await getMobileUser(req);
    if (!me) return NextResponse.json({ error: 'Neplatné nebo vypršelé přihlášení.' }, { status: 401 });
    const { userId, typing } = await req.json();
    if (!userId) return NextResponse.json({ error: 'Chýba userId.' }, { status: 400 });

    await Promise.all([
      setTyping(me.id, userId, !!typing),
      touchLastActive(me.id)
    ]);
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error('[api/mobile/messages/typing POST]', error);
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
