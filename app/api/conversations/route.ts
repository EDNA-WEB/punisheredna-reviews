import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { sortedPair } from '@/lib/conversation';

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Musíš byť prihlásený.' }, { status: 401 });
  const myId = (session.user as any).id;

  const { otherId, action } = await req.json();
  if (!otherId || !['accept', 'decline'].includes(action)) {
    return NextResponse.json({ error: 'Neplatná požiadavka.' }, { status: 400 });
  }

  const [userAId, userBId] = sortedPair(myId, otherId);
  const conversation = await prisma.conversation.findUnique({ where: { userAId_userBId: { userAId, userBId } } });
  if (!conversation) return NextResponse.json({ error: 'Konverzácia sa nenašla.' }, { status: 404 });

  // Rozhodnúť môže len ten, kto konverzáciu nezačal.
  if (conversation.initiatorId === myId) {
    return NextResponse.json({ error: 'Vlastnú požiadavku nemôžeš schváliť ani zamietnuť.' }, { status: 403 });
  }
  if (conversation.status !== 'PENDING') {
    return NextResponse.json({ error: 'O tejto konverzácii sa už rozhodlo.' }, { status: 409 });
  }

  const updated = await prisma.conversation.update({
    where: { id: conversation.id },
    data: { status: action === 'accept' ? 'ACCEPTED' : 'DECLINED', respondedAt: new Date() }
  });

  return NextResponse.json(updated);
}
