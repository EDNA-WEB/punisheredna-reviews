import { NextResponse } from 'next/server';
import { getMobileUser } from '@/lib/mobileAuth';
import { getEmailPreferences, updateEmailPreferences, sendMyVerification } from '@/lib/email/preferences';

export const dynamic = 'force-dynamic';

const UNAUTH = () => NextResponse.json({ error: 'Neplatné nebo vypršelé přihlášení.' }, { status: 401 });

export async function GET(req: Request) {
  const u = await getMobileUser(req);
  if (!u) return UNAUTH();
  return NextResponse.json(await getEmailPreferences(u.id));
}

export async function PATCH(req: Request) {
  const u = await getMobileUser(req);
  if (!u) return UNAUTH();
  return NextResponse.json(await updateEmailPreferences(u.id, await req.json().catch(() => ({}))));
}

export async function POST(req: Request) {
  const u = await getMobileUser(req);
  if (!u) return UNAUTH();
  const r = await sendMyVerification(u.id);
  if (!r.ok && r.reason === 'cooldown') return NextResponse.json({ error: `Zkus to znovu za ${r.retryIn} s.` }, { status: 429 });
  if (!r.ok) return NextResponse.json({ error: 'E-mail se nepodařilo odeslat.' }, { status: 500 });
  return NextResponse.json({ ok: true });
}
