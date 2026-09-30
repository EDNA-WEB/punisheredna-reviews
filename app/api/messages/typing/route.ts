import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isTypingTo, setTyping } from '@/lib/chatRealtime';

// Web — "píšem" / "prestal som písať" (rovnaká logika ako appka, lib/chatRealtime.ts).
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Musíš byť prihlásený.' }, { status: 401 });
    const { receiverId, typing } = await req.json();
    if (typeof receiverId !== 'string' || !receiverId) return NextResponse.json({ ok: false }, { status: 400 });
    if (!receiverId) return NextResponse.json({ error: 'Chýba príjemca.' }, { status: 400 });
    await setTyping((session.user as any).id, receiverId, !!typing);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[api/messages/typing]', error);
    return NextResponse.json({ ok: false });
  }
}

// GET ?otherId= — píše mi práve druhá strana? (malý dopyt každé ~2 s z otvoreného chatu)
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ typing: false }, { status: 401 });
    const otherId = new URL(req.url).searchParams.get('otherId');
    if (!otherId) return NextResponse.json({ typing: false });
    return NextResponse.json({ typing: await isTypingTo(otherId, (session.user as any).id) });
  } catch {
    return NextResponse.json({ typing: false });
  }
}
