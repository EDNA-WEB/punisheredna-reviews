import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getRecentlyViewed, recordRecentView, clearRecentlyViewed } from '@/lib/recentlyViewed';

export const dynamic = 'force-dynamic';

// Nedávno prohlížené pre web (prihlásenie cez NextAuth).
async function viewerId() {
  const session = await getServerSession(authOptions);
  return ((session?.user as any)?.id as string) || null;
}

export async function GET() {
  const userId = await viewerId();
  if (!userId) return NextResponse.json({ error: 'Musíš být přihlášen.' }, { status: 401 });
  try {
    return NextResponse.json({ movies: await getRecentlyViewed(userId) }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    console.error('[api/recently-viewed GET]', error);
    return NextResponse.json({ error: 'Chyba při načítání.' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const userId = await viewerId();
  if (!userId) return NextResponse.json({ error: 'Musíš být přihlášen.' }, { status: 401 });
  try {
    const body = await req.json().catch(() => ({}));
    const movieId = typeof body?.movieId === 'string' ? body.movieId.slice(0, 64) : '';
    if (!movieId) return NextResponse.json({ error: 'Chybí movieId.' }, { status: 400 });
    await recordRecentView(userId, movieId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[api/recently-viewed POST]', error);
    return NextResponse.json({ error: 'Požadavek selhal.' }, { status: 400 });
  }
}

export async function DELETE() {
  const userId = await viewerId();
  if (!userId) return NextResponse.json({ error: 'Musíš být přihlášen.' }, { status: 401 });
  try {
    await clearRecentlyViewed(userId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[api/recently-viewed DELETE]', error);
    return NextResponse.json({ error: 'Požadavek selhal.' }, { status: 500 });
  }
}
