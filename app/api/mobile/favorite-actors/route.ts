import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getMobileUser } from '@/lib/mobileAuth';

export const dynamic = 'force-dynamic';

const MAX_FAVORITE_ACTORS = 10;

// Rovnaký princíp ako web (PersonFollow, /api/people/follow) — appka
// navyše obmedzuje na max. 10, presne ako pri obľúbených filmoch/seriáloch.
export async function GET(req: Request) {
  try {
    const me = await getMobileUser(req);
    if (!me) return NextResponse.json({ error: 'Neplatné alebo vypršané prihlásenie.' }, { status: 401 });

    const follows = await prisma.personFollow.findMany({
      where: { userId: me.id },
      orderBy: { createdAt: 'desc' },
      select: { person: { select: { id: true, name: true, slug: true, photo: true, birthPlace: true } } }
    });

    return NextResponse.json({ actors: follows.map((f) => f.person), max: MAX_FAVORITE_ACTORS }, { status: 200 });
  } catch (error) {
    console.error('[api/mobile/favorite-actors GET]', error);
    return NextResponse.json({ error: 'Chyba při načítání.' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const me = await getMobileUser(req);
    if (!me) return NextResponse.json({ error: 'Neplatné alebo vypršané prihlásenie.' }, { status: 401 });

    const { personId } = await req.json();
    if (!personId) return NextResponse.json({ error: 'Chýba personId.' }, { status: 400 });

    const existing = await prisma.personFollow.findUnique({ where: { userId_personId: { userId: me.id, personId } } });
    if (existing) {
      await prisma.personFollow.delete({ where: { id: existing.id } });
      return NextResponse.json({ following: false }, { status: 200 });
    }

    const count = await prisma.personFollow.count({ where: { userId: me.id } });
    if (count >= MAX_FAVORITE_ACTORS) {
      return NextResponse.json({ error: `Můžeš mít maximálně ${MAX_FAVORITE_ACTORS} oblíbených herců.` }, { status: 400 });
    }

    await prisma.personFollow.create({ data: { userId: me.id, personId } });
    return NextResponse.json({ following: true }, { status: 201 });
  } catch (error) {
    console.error('[api/mobile/favorite-actors POST]', error);
    return NextResponse.json({ error: 'Požadavek selhal.' }, { status: 400 });
  }
}
