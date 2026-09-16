import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Nemáš oprávnenie na túto akciu.' }, { status: 403 });
  }

  const { userId } = await req.json();
  if (!userId) return NextResponse.json({ error: 'Chýba ID používateľa.' }, { status: 400 });

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { membershipUntil: null }
  });

  return NextResponse.json({ ok: true, name: updated.name });
}
