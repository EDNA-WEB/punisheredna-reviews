import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getMobileUser } from '@/lib/mobileAuth';
import { checkRateLimit } from '@/lib/antiSpam';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const me = await getMobileUser(req);
    if (!me) return NextResponse.json({ error: 'Neplatné alebo vypršané prihlásenie.' }, { status: 401 });

    const meFull = await prisma.user.findUnique({ where: { id: me.id } });
    if (!meFull || meFull.banned) return NextResponse.json({ error: 'Tvůj účet byl zablokován.' }, { status: 403 });

    const { targetId } = await req.json();
    if (!targetId || targetId === me.id) {
      return NextResponse.json({ error: 'Neplatný požadavek.' }, { status: 400 });
    }

    const rateLimitError = await checkRateLimit('follow', me.id, meFull.createdAt);
    if (rateLimitError) return NextResponse.json({ error: rateLimitError }, { status: 429 });

    const existing = await prisma.follow.findUnique({
      where: { followerId_followingId: { followerId: me.id, followingId: targetId } }
    });

    if (existing) {
      await prisma.follow.delete({ where: { id: existing.id } });
      return NextResponse.json({ following: false }, { status: 200 });
    } else {
      await prisma.follow.create({ data: { followerId: me.id, followingId: targetId } });
      return NextResponse.json({ following: true }, { status: 200 });
    }
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return NextResponse.json({ error: 'Tato akce se už zpracovává nebo byla provedena.' }, { status: 409 });
    }
    console.error('[api/mobile/follow]', error);
    return NextResponse.json({ error: 'Požadavek selhal. Zkus to prosím znovu.' }, { status: 400 });
  }
}
