import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

import { hasInjectedObject } from '@/lib/inputGuard';
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Nemáš oprávnění k této akci.' }, { status: 403 });
  }

  const { userId } = await req.json();
  if (hasInjectedObject(userId)) return NextResponse.json({ error: 'Neplatné údaje.' }, { status: 400 });
  if (!userId) return NextResponse.json({ error: 'Chybí ID uživatele.' }, { status: 400 });

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { membershipUntil: null }
  });

  return NextResponse.json({ ok: true, name: updated.name });
}
