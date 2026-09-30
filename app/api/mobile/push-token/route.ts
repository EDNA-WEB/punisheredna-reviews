import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getMobileUser } from '@/lib/mobileAuth';

export const dynamic = 'force-dynamic';

// Registrácia zariadenia pre push notifikácie + jeho nastavenia
// (upozornenia na správy zap/vyp, zvuk zap/vyp) z Nastavení appky.
export async function POST(req: Request) {
  try {
    const me = await getMobileUser(req);
    if (!me) return NextResponse.json({ error: 'Neplatné nebo vypršelé přihlášení.' }, { status: 401 });
    const { token, platform, notifyMessages, sound } = await req.json();
    if (!token || typeof token !== 'string' || token.length > 300) {
      return NextResponse.json({ error: 'Neplatný token.' }, { status: 400 });
    }
    const data = {
      userId: me.id,
      platform: platform ? String(platform).slice(0, 20) : null,
      notifyMessages: notifyMessages !== false,
      sound: sound !== false
    };
    // Ak sa na zariadení prihlási iný účet, token sa prepíše na neho.
    await prisma.pushToken.upsert({ where: { token }, create: { token, ...data }, update: data });
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error('[api/mobile/push-token POST]', error);
    return NextResponse.json({ error: 'Uložení selhalo.' }, { status: 400 });
  }
}

// Odhlásenie zo zariadenia — aby na telefón nechodili správy cudzieho účtu.
export async function DELETE(req: Request) {
  try {
    const me = await getMobileUser(req);
    if (!me) return NextResponse.json({ error: 'Neplatné nebo vypršelé přihlášení.' }, { status: 401 });
    const token = new URL(req.url).searchParams.get('token');
    if (token) await prisma.pushToken.deleteMany({ where: { token, userId: me.id } });
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error('[api/mobile/push-token DELETE]', error);
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
