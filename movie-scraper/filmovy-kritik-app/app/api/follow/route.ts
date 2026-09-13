import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { checkRateLimit } from '@/lib/antiSpam';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Musíš byť prihlásený.' }, { status: 401 });

    const myId = (session.user as any).id;
    const me = await prisma.user.findUnique({ where: { id: myId } });
    if (!me || me.banned) return NextResponse.json({ error: 'Tvoj účet bol zablokovaný.' }, { status: 403 });

    const { targetId } = await req.json();
    if (!targetId || targetId === myId) {
      return NextResponse.json({ error: 'Neplatná požiadavka.' }, { status: 400 });
    }

    const rateLimitError = await checkRateLimit('follow', myId, me.createdAt);
    if (rateLimitError) return NextResponse.json({ error: rateLimitError }, { status: 429 });

    const existing = await prisma.follow.findUnique({
      where: { followerId_followingId: { followerId: myId, followingId: targetId } }
    });

    if (existing) {
      await prisma.follow.delete({ where: { id: existing.id } });
      return NextResponse.json({ following: false });
    } else {
      await prisma.follow.create({ data: { followerId: myId, followingId: targetId } });
      return NextResponse.json({ following: true });
    }
  } catch (err: any) {
    if (err?.code === 'P2002') {
      return NextResponse.json({ error: 'Táto akcia sa už spracováva alebo bola vykonaná.' }, { status: 409 });
    }
    console.error(err);
    return NextResponse.json({ error: 'Požiadavka zlyhala. Skús to prosím znova.' }, { status: 400 });
  }
}
