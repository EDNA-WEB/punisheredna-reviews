import { NextResponse } from 'next/server';
import { getMobileUser } from '@/lib/mobileAuth';
import { getTop10 } from '@/lib/top10';
import { top10Meta } from '@/lib/top10Meta';

export const dynamic = 'force-dynamic';

// Top 10 tento týden pre appku — rovnaký rebríček ako na webe.
export async function GET(req: Request) {
  try {
    const me = await getMobileUser(req);
    const { items, updatedAt } = await getTop10(me?.id);
    return NextResponse.json({ movies: items.map((m) => ({ ...m, meta: top10Meta(m) })), updatedAt }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    console.error('[api/mobile/top10]', error);
    return NextResponse.json({ error: 'Chyba při načítání.' }, { status: 500 });
  }
}
