import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getMobileUser } from '@/lib/mobileAuth';

export const dynamic = 'force-dynamic';

// Vyhľadávanie používateľov pre "Nová zpráva" v appke — prezývka ZAČÍNA na
// zadané písmená (bez ohľadu na veľkosť). Napr. "pu" → PunisherEDNA, Pusheen…
export async function GET(req: Request) {
  try {
    const me = await getMobileUser(req);
    if (!me) return NextResponse.json({ error: 'Neplatné alebo vypršané prihlásenie.' }, { status: 401 });

    const q = (new URL(req.url).searchParams.get('q') || '').trim().slice(0, 40);
    if (q.length < 1) return NextResponse.json({ users: [] }, { status: 200 });

    const users = await prisma.user.findMany({
      where: { name: { startsWith: q, mode: 'insensitive' }, id: { not: me.id }, banned: false },
      orderBy: { name: 'asc' },
      take: 20,
      select: { id: true, name: true, avatar: true, role: true }
    });
    return NextResponse.json({ users }, { status: 200 });
  } catch (error) {
    console.error('[api/mobile/users-search]', error);
    return NextResponse.json({ users: [] }, { status: 200 });
  }
}
