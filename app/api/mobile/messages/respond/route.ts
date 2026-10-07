import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getMobileUser } from '@/lib/mobileAuth';
import { sortedPair } from '@/lib/conversation';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const user = await getMobileUser(req);
    if (!user) return NextResponse.json({ error: 'Neplatné nebo vypršelé přihlášení.' }, { status: 401 });

    const { otherId, action } = await req.json();
    if (!otherId || !['accept', 'decline'].includes(action)) {
      return NextResponse.json({ error: 'Neplatný požadavek.' }, { status: 400 });
    }

    const [userAId, userBId] = sortedPair(user.id, String(otherId));
    const conversation = await prisma.conversation.findUnique({ where: { userAId_userBId: { userAId, userBId } } });
    if (!conversation) return NextResponse.json({ error: 'Konverzace se nenašla.' }, { status: 404 });

    // Bezpečnosť (rovnako ako na webe): rozhodnúť môže len príjemca žiadosti
    // a len kým čaká. Predtým si odosielateľ vedel sám schváliť svoju žiadosť
    // alebo zrušiť odmietnutie.
    if (conversation.initiatorId === user.id) {
      return NextResponse.json({ error: 'Vlastní žádost nemůžeš schválit ani zamítnout.' }, { status: 403 });
    }
    const { count } = await prisma.conversation.updateMany({
      where: { id: conversation.id, status: 'PENDING' },
      data: { status: action === 'accept' ? 'ACCEPTED' : 'DECLINED', respondedAt: new Date() }
    });
    if (count === 0) {
      return NextResponse.json({ error: 'O této konverzaci už bylo rozhodnuto.' }, { status: 409 });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error('[api/mobile/messages/respond]', error);
    return NextResponse.json({ error: 'Chyba při zpracování.' }, { status: 500 });
  }
}
