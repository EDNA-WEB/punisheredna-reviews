import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redeemMembershipCode } from '@/lib/membership';
import { hitSharedLimit } from '@/lib/sharedRateLimit';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Musíš byť prihlásený.' }, { status: 401 });

  const userId = (session.user as any).id;
  // Proti hádaniu kódov: max. 10 pokusov za hodinu na účet.
  if (!(await hitSharedLimit(`redeem:${userId}`, 3_600_000, 10, { failClosed: true }))) {
    return NextResponse.json({ error: 'Příliš mnoho pokusů. Zkus to znovu za hodinu.' }, { status: 429 });
  }
  const { code } = await req.json().catch(() => ({}));
  if (!code || typeof code !== 'string') {
    return NextResponse.json({ error: 'Zadej prosím kód.' }, { status: 400 });
  }

  const result = await redeemMembershipCode(userId, code);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });

  return NextResponse.json({ ok: true, until: result.until, label: result.label });
}
