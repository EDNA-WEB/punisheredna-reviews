import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

import { hasInjectedObject } from '@/lib/inputGuard';
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Musíš byť prihlásený.' }, { status: 401 });

  const userId = (session.user as any).id;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.banned) return NextResponse.json({ error: 'Tvůj účet byl zablokován.' }, { status: 403 });

  const { personId } = await req.json();
  if (hasInjectedObject(personId)) return NextResponse.json({ error: 'Neplatné údaje.' }, { status: 400 });
  if (!personId) return NextResponse.json({ error: 'Neplatná požiadavka.' }, { status: 400 });

  const existing = await prisma.personFollow.findUnique({ where: { userId_personId: { userId, personId } } });
  if (existing) {
    await prisma.personFollow.delete({ where: { id: existing.id } });
    return NextResponse.json({ following: false });
  } else {
    const targetPerson = await prisma.person.findUnique({ where: { id: personId }, select: { role: true } });
    if (!targetPerson) return NextResponse.json({ error: 'Osoba se nenašla.' }, { status: 404 });
    const currentFollows = await prisma.personFollow.findMany({ where: { userId }, select: { person: { select: { role: true } } } });
    const sameRoleCount = currentFollows.filter((f) => f.person.role === targetPerson.role).length;
    if (sameRoleCount >= 10) {
      const label = targetPerson.role === 'CREATOR' ? 'tvorcov' : 'hercov';
      return NextResponse.json({ error: `Můžeš mít maximálně 10 oblíbených ${label}.` }, { status: 400 });
    }
    await prisma.personFollow.create({ data: { userId, personId } });
    return NextResponse.json({ following: true });
  }
}
