import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { sortedPair } from '@/lib/conversation';

export async function DELETE(_req: Request, { params }: { params: { otherId: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Musíš byť prihlásený.' }, { status: 401 });
  const myId = (session.user as any).id;

  await prisma.message.deleteMany({
    where: {
      OR: [
        { senderId: myId, receiverId: params.otherId },
        { senderId: params.otherId, receiverId: myId }
      ]
    }
  });

  const [userAId, userBId] = sortedPair(myId, params.otherId);
  await prisma.conversation.deleteMany({ where: { userAId, userBId } });

  return NextResponse.json({ ok: true });
}
