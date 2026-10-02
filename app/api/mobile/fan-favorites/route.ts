import { NextResponse } from 'next/server';
import { getMobileUser } from '@/lib/mobileAuth';
import { getFanFavorites } from '@/lib/fanFavorites';

export const dynamic = 'force-dynamic';

// Oblíbené mezi fanoušky pre appku — rovnaké poradie ako na webe. S tokenom
// navyše vráti, čo má prihlásený v Chci vidět a ako film sám ohodnotil.
export async function GET(req: Request) {
  try {
    const me = await getMobileUser(req);
    const { items, updatedAt } = await getFanFavorites(me?.id);
    return NextResponse.json({ movies: items, updatedAt }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    console.error('[api/mobile/fan-favorites]', error);
    return NextResponse.json({ error: 'Chyba při načítání.' }, { status: 500 });
  }
}
