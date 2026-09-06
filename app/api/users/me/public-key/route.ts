import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Musíš byť prihlásený.' }, { status: 401 });
  const myId = (session.user as any).id;

  const { publicKey } = await req.json();
  if (!publicKey || typeof publicKey !== 'string') {
    return NextResponse.json({ error: 'Chýba verejný kľúč.' }, { status: 400 });
  }

  await prisma.user.update({ where: { id: myId }, data: { publicKey } });
  return NextResponse.json({ ok: true });
}
