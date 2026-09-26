import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getMobileUser } from '@/lib/mobileAuth';
import { tryDecryptMessageBody } from '@/lib/serverCrypto';
import { sortedPair } from '@/lib/conversation';

export const dynamic = 'force-dynamic';

// Zjednodušená appková verzia webu — len textové správy (fotky s
// časovo obmedzeným zobrazením zatiaľ appka nerieši). Zároveň označí
// nové prijaté správy ako prečítané, presne ako web.
export async function GET(req: Request) {
  try {
    const user = await getMobileUser(req);
    if (!user) return NextResponse.json({ error: 'Neplatné alebo vypršané prihlásenie.' }, { status: 401 });
    const myId = user.id;

    const { searchParams } = new URL(req.url);
    const otherId = searchParams.get('userId');
    if (!otherId) return NextResponse.json({ error: 'Chýba userId.' }, { status: 400 });

    const other = await prisma.user.findUnique({ where: { id: otherId }, select: { id: true, name: true, avatar: true } });
    if (!other) return NextResponse.json({ error: 'Používateľ sa nenašiel.' }, { status: 404 });

    await prisma.message.updateMany({ where: { senderId: other.id, receiverId: myId, read: false }, data: { read: true } });

    const myDeletion = await prisma.conversationDeletion.findUnique({ where: { userId_otherId: { userId: myId, otherId: other.id } } });

    const rawMessages = await prisma.message.findMany({
      where: {
        OR: [
          { senderId: myId, receiverId: other.id },
          { senderId: other.id, receiverId: myId }
        ],
        ...(myDeletion ? { createdAt: { gt: myDeletion.deletedAt } } : {})
      },
      orderBy: { createdAt: 'asc' },
      select: { id: true, senderId: true, receiverId: true, body: true, iv: true, image: true, read: true, createdAt: true }
    });

    const messages = rawMessages.map((m) => ({
      id: m.id,
      senderId: m.senderId,
      body: m.image ? null : m.body && m.iv ? tryDecryptMessageBody(m.body, m.iv) : m.body || '',
      image: m.image,
      read: m.read,
      createdAt: m.createdAt
    }));

    const [userAId, userBId] = sortedPair(myId, other.id);
    const conversation = await prisma.conversation.findUnique({ where: { userAId_userBId: { userAId, userBId } } });

    const status = conversation?.status || null;
    const isPendingForMe = status === 'PENDING' && conversation?.initiatorId !== myId;
    const isPendingWaiting = status === 'PENDING' && conversation?.initiatorId === myId && messages.length > 0;
    const isDeclined = status === 'DECLINED';

    return NextResponse.json({ other, messages, isPendingForMe, isPendingWaiting, isDeclined }, { status: 200 });
  } catch (error) {
    console.error('[api/mobile/messages/thread]', error);
    return NextResponse.json({ error: 'Chyba pri načítaní konverzácie.' }, { status: 500 });
  }
}
