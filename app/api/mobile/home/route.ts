import { NextResponse } from 'next/server';
import { getMobileUser } from '@/lib/mobileAuth';
import { isActiveMember } from '@/lib/membership';
import { loadHomePage } from '@/lib/homePage';

export const dynamic = 'force-dynamic';

// Domovská obrazovka appky v novom vzhľade — rovnaké údaje ako hlavná
// stránka webu (lib/homePage.ts), všetko jedným volaním.
// Prihlásenie je voliteľné (osobné časti sú bez neho prázdne).
export async function GET(req: Request) {
  try {
    const me = await getMobileUser(req).catch(() => null);
    const viewerId = me?.id || null;
    const isMember = !!me && (me.role === 'ADMIN' || (await isActiveMember(me.id)));
    const data = await loadHomePage({ viewerId, isMember, personalizationAllowed: true });
    return NextResponse.json(
      { ...data, isMember, contest: { url: '/sutaz/hbo' } },
      { headers: { 'Cache-Control': 'private, no-store' } }
    );
  } catch (error) {
    console.error('[api/mobile/home]', error);
    return NextResponse.json({ error: 'Chyba při načítání.' }, { status: 500 });
  }
}
