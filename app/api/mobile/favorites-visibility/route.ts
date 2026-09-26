import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getMobileUser } from '@/lib/mobileAuth';

export const dynamic = 'force-dynamic';

const VALID = ['ONLY_ME', 'EVERYONE', 'LOGGED_IN', 'ONLY_FAVORITES'];

export async function GET(req: Request) {
  const me = await getMobileUser(req);
  if (!me) return NextResponse.json({ error: 'Neplatné alebo vypršané prihlásenie.' }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { id: me.id }, select: { favoritesVisibility: true } });
  return NextResponse.json({ visibility: user?.favoritesVisibility || 'EVERYONE' }, { status: 200 });
}

export async function POST(req: Request) {
  try {
    const me = await getMobileUser(req);
    if (!me) return NextResponse.json({ error: 'Neplatné alebo vypršané prihlásenie.' }, { status: 401 });

    const { visibility } = await req.json();
    if (!VALID.includes(visibility)) return NextResponse.json({ error: 'Neplatná hodnota.' }, { status: 400 });

    await prisma.user.update({ where: { id: me.id }, data: { favoritesVisibility: visibility } });
    return NextResponse.json({ ok: true, visibility }, { status: 200 });
  } catch (error) {
    console.error('[api/mobile/favorites-visibility]', error);
    return NextResponse.json({ error: 'Chyba při ukládání.' }, { status: 500 });
  }
}
