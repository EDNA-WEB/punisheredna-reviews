import { NextResponse } from 'next/server';
import { getMobileUser } from '@/lib/mobileAuth';
import { getRecentlyViewed, recordRecentView, clearRecentlyViewed } from '@/lib/recentlyViewed';

export const dynamic = 'force-dynamic';

// Nedávno prohlížené pre appku (token v hlavičke Authorization) — rovnaké
// dáta ako na webe, takže história je spoločná.
const UNAUTH = { error: 'Neplatné nebo vypršelé přihlášení.' };

export async function GET(req: Request) {
  const me = await getMobileUser(req);
  if (!me) return NextResponse.json(UNAUTH, { status: 401 });
  try {
    return NextResponse.json({ movies: await getRecentlyViewed(me.id) }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    console.error('[api/mobile/recently-viewed GET]', error);
    return NextResponse.json({ error: 'Chyba při načítání.' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const me = await getMobileUser(req);
  if (!me) return NextResponse.json(UNAUTH, { status: 401 });
  try {
    const body = await req.json().catch(() => ({}));
    const movieId = typeof body?.movieId === 'string' ? body.movieId.slice(0, 64) : '';
    if (!movieId) return NextResponse.json({ error: 'Chybí movieId.' }, { status: 400 });
    await recordRecentView(me.id, movieId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[api/mobile/recently-viewed POST]', error);
    return NextResponse.json({ error: 'Požadavek selhal.' }, { status: 400 });
  }
}

export async function DELETE(req: Request) {
  const me = await getMobileUser(req);
  if (!me) return NextResponse.json(UNAUTH, { status: 401 });
  try {
    await clearRecentlyViewed(me.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[api/mobile/recently-viewed DELETE]', error);
    return NextResponse.json({ error: 'Požadavek selhal.' }, { status: 500 });
  }
}
