import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { applyReaction, reactionTargetKey } from '@/lib/reactions';

// Logika reakcií je v lib/reactions.ts (zdieľaná s appkou) — tu len webové prihlásenie.
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Musíš byť prihlásený.' }, { status: 401 });

    const userId = (session.user as any).id;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.banned) return NextResponse.json({ error: 'Tvůj účet byl zablokován.' }, { status: 403 });

    const body = await req.json();
    const targetKey = reactionTargetKey(body);
    if (!targetKey) return NextResponse.json({ error: 'Neplatná požiadavka.' }, { status: 400 });

    const result = await applyReaction(user, targetKey, body.value);
    return NextResponse.json(result.body, { status: result.status });
  } catch (err: any) {
    if (err?.code === 'P2002') {
      return NextResponse.json({ error: 'Tato akce se už zpracovává nebo byla provedena.' }, { status: 409 });
    }
    console.error(err);
    return NextResponse.json({ error: 'Požadavek selhal. Zkus to prosím znovu.' }, { status: 400 });
  }
}
