import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Nemáš oprávnenie na túto akciu.' }, { status: 403 });
  }

  const { userId, isEditor } = await req.json();
  if (!userId || typeof isEditor !== 'boolean') {
    return NextResponse.json({ error: 'Chýbajú potrebné údaje.' }, { status: 400 });
  }

  const target = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (!target) return NextResponse.json({ error: 'Používateľ sa nenašiel.' }, { status: 404 });
  if (target.role === 'ADMIN') {
    return NextResponse.json({ error: 'Admin už má plný prístup, právo redaktora tu netreba nastavovať.' }, { status: 400 });
  }

  const updated = await prisma.user.update({ where: { id: userId }, data: { isEditor } });
  return NextResponse.json({ ok: true, name: updated.name, isEditor: updated.isEditor });
}
