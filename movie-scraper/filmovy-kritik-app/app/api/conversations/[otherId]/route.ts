import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Vymazanie konverzácie je len pre toho, kto to urobil — len si zapamätáme čas,
// odkedy on/ona nechce vidieť staršie správy. Druhej strane sa nič nezmaže.
export async function DELETE(_req: Request, { params }: { params: { otherId: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Musíš byť prihlásený.' }, { status: 401 });
  const myId = (session.user as any).id;

  await prisma.conversationDeletion.upsert({
    where: { userId_otherId: { userId: myId, otherId: params.otherId } },
    update: { deletedAt: new Date() },
    create: { userId: myId, otherId: params.otherId, deletedAt: new Date() }
  });

  return NextResponse.json({ ok: true });
}
