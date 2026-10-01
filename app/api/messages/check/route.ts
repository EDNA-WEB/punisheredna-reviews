import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { conversationActivity } from '@/lib/messageActions';

export const dynamic = 'force-dynamic';

// Otvorený chat na webe sa pýta len na "verziu" konverzácie (jeden malý dopyt)
// a celú stránku obnoví, až keď sa zmení (nová správa alebo prečítanie).
// Pôvodne sa celá stránka prekresľovala každé 4 s (~6 dopytov zakaždým).
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ version: null }, { status: 401 });
  const me = (session.user as any).id as string;
  const otherId = new URL(req.url).searchParams.get('otherId');
  if (!otherId) return NextResponse.json({ version: null });
  if (otherId.length > 64) return NextResponse.json({ version: null });
  const [last, activity] = await Promise.all([
    prisma.message.findFirst({
      where: { OR: [{ senderId: me, receiverId: otherId }, { senderId: otherId, receiverId: me }] },
      orderBy: { createdAt: 'desc' },
      select: { id: true, read: true, audioListenedAt: true }
    }),
    conversationActivity(me, otherId)
  ]);
  // + či bola posledná hlasovka vypočutá (odosielateľ hneď uvidí „Poslechnuto“)
  return NextResponse.json({ version: `${last ? `${last.id}:${last.read ? 1 : 0}:${last.audioListenedAt ? 1 : 0}` : 'none'}:${activity}` });
}
