import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getMobileUser } from '@/lib/mobileAuth';
import { sortedPair } from '@/lib/conversation';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const user = await getMobileUser(req);
    if (!user) return NextResponse.json({ error: 'Neplatné alebo vypršané prihlásenie.' }, { status: 401 });

    const { otherId, action } = await req.json();
    if (!otherId || !['accept', 'decline'].includes(action)) {
      return NextResponse.json({ error: 'Neplatný požadavek.' }, { status: 400 });
    }

    const [userAId, userBId] = sortedPair(user.id, otherId);
    await prisma.conversation.update({
      where: { userAId_userBId: { userAId, userBId } },
      data: { status: action === 'accept' ? 'ACCEPTED' : 'DECLINED', respondedAt: new Date() }
    });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error('[api/mobile/messages/respond]', error);
    return NextResponse.json({ error: 'Chyba při zpracování.' }, { status: 500 });
  }
}
