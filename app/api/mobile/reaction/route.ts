import { NextResponse } from 'next/server';
import { getMobileUser } from '@/lib/mobileAuth';
import { applyReaction, reactionTargetKey } from '@/lib/reactions';

export const dynamic = 'force-dynamic';

// Páči sa / nepáči sa z appky (článok, komentár, recenzia, príspevok) —
// presne tá istá logika ako web (lib/reactions.ts), len prihlásenie cez token.
// Pôvodne appka volala webové /api/likes, ktoré ale funguje len s cookies
// prehliadača, takže lajk z appky sa v skutočnosti nikdy neuložil.
export async function POST(req: Request) {
  try {
    const me = await getMobileUser(req);
    if (!me) return NextResponse.json({ error: 'Neplatné nebo vypršelé přihlášení.' }, { status: 401 });

    const body = await req.json();
    const targetKey = reactionTargetKey(body);
    if (!targetKey) return NextResponse.json({ error: 'Neplatná požiadavka.' }, { status: 400 });

    const result = await applyReaction(me, targetKey, body.value);
    return NextResponse.json(result.body, { status: result.status });
  } catch (err: any) {
    if (err?.code === 'P2002') {
      return NextResponse.json({ error: 'Akce se už zpracovává.' }, { status: 409 });
    }
    console.error('[api/mobile/reaction]', err);
    return NextResponse.json({ error: 'Požadavek selhal.' }, { status: 400 });
  }
}
