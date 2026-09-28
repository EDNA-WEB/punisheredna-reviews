import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getMobileUser } from '@/lib/mobileAuth';
import { tryDecryptMessageBody } from '@/lib/serverCrypto';

export const dynamic = 'force-dynamic';

// Ľahká kontrola pre appku, keď beží na popredí: počet neprečítaných správ a
// najnovšia z nich (na zvuk/upozornenie, ak push na zariadení nie je dostupný).
export async function GET(req: Request) {
  try {
    const me = await getMobileUser(req);
    if (!me) return NextResponse.json({ error: 'Neplatné alebo vypršané prihlásenie.' }, { status: 401 });

    const [unreadCount, latest] = await Promise.all([
      prisma.message.count({ where: { receiverId: me.id, read: false } }),
      prisma.message.findFirst({
        where: { receiverId: me.id, read: false },
        orderBy: { createdAt: 'desc' },
        select: { id: true, body: true, iv: true, image: true, createdAt: true, sender: { select: { id: true, name: true, avatar: true } } }
      })
    ]);

    return NextResponse.json(
      {
        unreadCount,
        latest: latest
          ? {
              id: latest.id,
              createdAt: latest.createdAt,
              sender: latest.sender,
              preview: latest.image ? '📷 Fotka' : latest.body && latest.iv ? tryDecryptMessageBody(latest.body, latest.iv) : latest.body || ''
            }
          : null
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[api/mobile/messages/unread-latest]', error);
    return NextResponse.json({ unreadCount: 0, latest: null }, { status: 200 });
  }
}
