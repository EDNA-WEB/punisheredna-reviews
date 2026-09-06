import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { tryDecryptMessageBody } from '@/lib/serverCrypto';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json([]);
  const myId = (session.user as any).id;

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
      const lastText = m.audio ? '🎤 Hlasová správa' : m.image ? 'Fotka' : m.body && m.iv ? tryDecryptMessageBody(m.body, m.iv) : m.body || '';
      map.set(other.id, {
        userId: other.id,
        name: other.name,
        avatar: other.avatar,
        lastText,
        lastAt: m.createdAt,
        unread: 0
      });
    }
    if (m.receiverId === myId && !m.read) {
      map.get(other.id).unread += 1;
    }
  }

  const list = Array.from(map.values()).slice(0, 5);
  return NextResponse.json(list);
}
