import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Musíš byť prihlásený.' }, { status: 401 });

  const userId = (session.user as any).id;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.banned) return NextResponse.json({ error: 'Tvoj účet bol zablokovaný.' }, { status: 403 });

  const { personId } = await req.json();
  if (!personId) return NextResponse.json({ error: 'Neplatná požiadavka.' }, { status: 400 });

  const existing = await prisma.personFollow.findUnique({ where: { userId_personId: { userId, personId } } });
  if (existing) {
    await prisma.personFollow.delete({ where: { id: existing.id } });
    return NextResponse.json({ following: false });
  } else {
    await prisma.personFollow.create({ data: { userId, personId } });
    return NextResponse.json({ following: true });
  }
}
