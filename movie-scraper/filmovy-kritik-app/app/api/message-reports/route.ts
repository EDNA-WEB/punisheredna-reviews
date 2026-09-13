import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { tryDecryptMessageBody } from '@/lib/serverCrypto';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Musíš byť prihlásený.' }, { status: 401 });
  const myId = (session.user as any).id;

  const { otherId } = await req.json();
  if (!otherId) return NextResponse.json({ error: 'Neplatný používateľ.' }, { status: 400 });

  const other = await prisma.user.findUnique({ where: { id: otherId }, select: { name: true } });
  if (!other) return NextResponse.json({ error: 'Používateľ sa nenašiel.' }, { status: 404 });

  // Zachytíme dešifrovaný odpis celej konverzácie v momente nahlásenia — admin
  // ho vie posúdiť aj bez schopnosti dešifrovať priamo databázu neskôr.
  const messages = await prisma.message.findMany({
    where: {
      OR: [
        { senderId: myId, receiverId: otherId },
        { senderId: otherId, receiverId: myId }
      ]
    },
    orderBy: { createdAt: 'asc' },
    select: { senderId: true, body: true, iv: true, image: true, createdAt: true }
  });

  const transcript = messages
    .map((m) => {
      const who = m.senderId === myId ? 'Ja' : other.name;
      const time = m.createdAt.toISOString();
      const text = m.image ? '[fotka]' : m.body && m.iv ? tryDecryptMessageBody(m.body, m.iv) : m.body || '';
      return `[${time}] ${who}: ${text}`;
    })
    .join('\n');

  await prisma.messageReport.create({
    data: { reporterId: myId, reportedUserId: otherId, transcript: transcript || '(konverzácia je prázdna)' }
  });

  return NextResponse.json({ ok: true });
}
