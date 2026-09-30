import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getMobileUser } from '@/lib/mobileAuth';

import { hasInjectedObject } from '@/lib/inputGuard';
export const dynamic = 'force-dynamic';

const MAX_FAVORITE_ACTORS = 10;

// Rovnaký princíp ako web (PersonFollow, /api/people/follow) — appka
// navyše obmedzuje na max. 10, presne ako pri obľúbených filmoch/seriáloch.
export async function GET(req: Request) {
  try {
    const me = await getMobileUser(req);
    if (!me) return NextResponse.json({ error: 'Neplatné nebo vypršelé přihlášení.' }, { status: 401 });

    const follows = await prisma.personFollow.findMany({
      where: { userId: me.id },
      orderBy: { createdAt: 'desc' },
      select: { person: { select: { id: true, name: true, slug: true, photo: true, birthPlace: true, role: true } } }
    });

    const people = follows.map((f) => f.person);
    return NextResponse.json(
      {
        actors: people.filter((p) => p.role !== 'CREATOR'),
        creators: people.filter((p) => p.role === 'CREATOR'),
        max: MAX_FAVORITE_ACTORS
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[api/mobile/favorite-actors GET]', error);
    return NextResponse.json({ error: 'Chyba při načítání.' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const me = await getMobileUser(req);
    if (!me) return NextResponse.json({ error: 'Neplatné nebo vypršelé přihlášení.' }, { status: 401 });

    const { personId } = await req.json();
    if (hasInjectedObject(personId)) return NextResponse.json({ error: 'Neplatné údaje.' }, { status: 400 });
    if (!personId) return NextResponse.json({ error: 'Chýba personId.' }, { status: 400 });

    const existing = await prisma.personFollow.findUnique({ where: { userId_personId: { userId: me.id, personId } } });
    if (existing) {
      await prisma.personFollow.delete({ where: { id: existing.id } });
      return NextResponse.json({ following: false }, { status: 200 });
    }

    const targetPerson = await prisma.person.findUnique({ where: { id: personId }, select: { role: true } });
    if (!targetPerson) return NextResponse.json({ error: 'Osoba se nenašla.' }, { status: 404 });

    const currentFollows = await prisma.personFollow.findMany({
      where: { userId: me.id },
      select: { person: { select: { role: true } } }
    });
    const sameRoleCount = currentFollows.filter((f) => f.person.role === targetPerson.role).length;
    if (sameRoleCount >= MAX_FAVORITE_ACTORS) {
      const label = targetPerson.role === 'CREATOR' ? 'tvůrců' : 'herců';
      return NextResponse.json({ error: `Můžeš mít maximálně ${MAX_FAVORITE_ACTORS} oblíbených ${label}.` }, { status: 400 });
    }

    await prisma.personFollow.create({ data: { userId: me.id, personId } });
    return NextResponse.json({ following: true }, { status: 201 });
  } catch (error) {
    console.error('[api/mobile/favorite-actors POST]', error);
    return NextResponse.json({ error: 'Požadavek selhal.' }, { status: 400 });
  }
}
