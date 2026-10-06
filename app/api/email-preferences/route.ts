import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getEmailPreferences, updateEmailPreferences, sendMyVerification } from '@/lib/email/preferences';

export const dynamic = 'force-dynamic';

async function me() {
  const session = await getServerSession(authOptions);
  return ((session?.user as any)?.id as string) || null;
}
const UNAUTH = NextResponse.json({ error: 'Musíš být přihlášen.' }, { status: 401 });

export async function GET() {
  const id = await me();
  if (!id) return UNAUTH;
  return NextResponse.json(await getEmailPreferences(id));
}

export async function PATCH(req: Request) {
  const id = await me();
  if (!id) return UNAUTH;
  return NextResponse.json(await updateEmailPreferences(id, await req.json().catch(() => ({}))));
}

// POST = poslať overovací e-mail na vlastnú adresu
export async function POST() {
  const id = await me();
  if (!id) return UNAUTH;
  const r = await sendMyVerification(id);
  if (!r.ok && r.reason === 'cooldown') return NextResponse.json({ error: `Zkus to znovu za ${r.retryIn} s.` }, { status: 429 });
  if (!r.ok) return NextResponse.json({ error: 'E-mail se nepodařilo odeslat.' }, { status: 500 });
  return NextResponse.json({ ok: true });
}
