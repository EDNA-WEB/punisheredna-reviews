import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getMobileUser } from '@/lib/mobileAuth';
import { tryDecryptMessageBody } from '@/lib/serverCrypto';
import { typersTo } from '@/lib/chatRealtime';
import { voicePreview } from '@/lib/voiceMessages';

export const dynamic = 'force-dynamic';

// Rovnaká logika ako /api/messages/recent na webe — zoskupí posledné
// správy podľa druhej strany konverzácie.
export async function GET(req: Request) {
  try {
    const user = await getMobileUser(req);
    if (!user) return NextResponse.json({ error: 'Neplatné nebo vypršelé přihlášení.' }, { status: 401 });
    const myId = user.id;

    const messages = await prisma.message.findMany({
      where: { OR: [{ senderId: myId }, { receiverId: myId }] },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        sender: { select: { id: true, name: true, avatar: true } },
        receiver: { select: { id: true, name: true, avatar: true } }
      }
    });

    const map = new Map<string, any>();
    for (const m of messages) {
      const other = m.senderId === myId ? m.receiver : m.sender;
      if (!map.has(other.id)) {
        const lastText = m.voice ? voicePreview(null) : m.image ? 'Fotka' : m.body && m.iv ? tryDecryptMessageBody(m.body, m.iv) : m.body || '';
        const lastKind = m.voice ? 'voice' : m.image ? 'image' : 'text';
        map.set(other.id, { userId: other.id, name: other.name, avatar: other.avatar, lastText, lastKind, lastAt: m.createdAt, unread: 0 });
      }
      if (m.receiverId === myId && !m.read) {
        map.get(other.id).unread += 1;
      }
    }

    // "píše…" v zozname konverzácií (ako WhatsApp).
    const typing = await typersTo(myId);
    const list = Array.from(map.values()).map((c) => ({ ...c, isTyping: typing.has(c.userId) }));
    return NextResponse.json(list, { status: 200 });
  } catch (error) {
    console.error('[api/mobile/messages/conversations]', error);
    return NextResponse.json({ error: 'Chyba při načítání konverzací.' }, { status: 500 });
  }
}
