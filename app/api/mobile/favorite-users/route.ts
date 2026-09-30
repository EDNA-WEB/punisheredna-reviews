import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getMobileUser } from '@/lib/mobileAuth';

export const dynamic = 'force-dynamic';

// Zoznam používateľov, čo prihlásený používateľ sleduje ("obľúbení").
// ?limit=10 pre náhľad na profile, bez limitu (alebo veľký limit) pre
// plný zoznam na obrazovke "Moje oblíbené".
export async function GET(req: Request) {
  try {
    const me = await getMobileUser(req);
    if (!me) return NextResponse.json({ error: 'Neplatné nebo vypršelé přihlášení.' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '100', 10);

    const follows = await prisma.follow.findMany({
      where: { followerId: me.id },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: { following: { select: { id: true, name: true, avatar: true } } }
    });

    return NextResponse.json(
      { users: follows.map((f) => f.following), count: await prisma.follow.count({ where: { followerId: me.id } }) },
      { status: 200 }
    );
  } catch (error) {
    console.error('[api/mobile/favorite-users]', error);
    return NextResponse.json({ error: 'Chyba při načítání.' }, { status: 500 });
  }
}
