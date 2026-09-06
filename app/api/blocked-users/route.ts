import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Musíš byť prihlásený.' }, { status: 401 });
  const myId = (session.user as any).id;

  const { userId } = await req.json();
  if (!userId || userId === myId) return NextResponse.json({ error: 'Neplatný používateľ.' }, { status: 400 });

  await prisma.blockedUser.upsert({
    where: { blockerId_blockedId: { blockerId: myId, blockedId: userId } },
    update: {},
    create: { blockerId: myId, blockedId: userId }
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Musíš byť prihlásený.' }, { status: 401 });
  const myId = (session.user as any).id;

  const { userId } = await req.json();
  if (!userId) return NextResponse.json({ error: 'Neplatný používateľ.' }, { status: 400 });

  await prisma.blockedUser.deleteMany({ where: { blockerId: myId, blockedId: userId } });

  return NextResponse.json({ ok: true });
}
