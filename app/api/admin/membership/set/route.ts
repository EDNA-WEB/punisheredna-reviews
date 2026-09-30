import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Nemáš oprávnění k této akci.' }, { status: 403 });
  }

  const { username, until } = await req.json();
  if (!username || !String(username).trim()) {
    return NextResponse.json({ error: 'Zadej přezdívku uživatele.' }, { status: 400 });
  }
  if (!until) {
    return NextResponse.json({ error: 'Zadej datum, do kdy má členství platit.' }, { status: 400 });
  }

  const untilDate = new Date(until);
  if (isNaN(untilDate.getTime())) {
    return NextResponse.json({ error: 'Neplatný dátum.' }, { status: 400 });
  }

  const user = await prisma.user.findFirst({ where: { name: String(username).trim() } });
  if (!user) return NextResponse.json({ error: 'Uživatel s touto přezdívkou se nenašel.' }, { status: 404 });

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { membershipUntil: untilDate }
  });

  return NextResponse.json({ ok: true, name: updated.name, membershipUntil: updated.membershipUntil });
}
