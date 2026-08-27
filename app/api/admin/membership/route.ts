import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { generatePaidCode } from '@/lib/membership';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Nemáš oprávnenie na túto akciu.' }, { status: 403 });
  }

  const codes = await prisma.membershipCode.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: { usedBy: { select: { name: true } } }
  });

  return NextResponse.json(codes);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Nemáš oprávnenie na túto akciu.' }, { status: 403 });
  }

  const { type, targetUsername } = await req.json();
  if (type !== 'month' && type !== 'year') {
    return NextResponse.json({ error: 'Neplatný typ členstva.' }, { status: 400 });
  }

  let targetUserId: string | undefined;
  if (targetUsername && String(targetUsername).trim()) {
    const target = await prisma.user.findFirst({ where: { name: String(targetUsername).trim() }, select: { id: true } });
    if (!target) return NextResponse.json({ error: 'Používateľ s touto prezývkou sa nenašiel.' }, { status: 404 });
    targetUserId = target.id;
  }

  const code = await generatePaidCode(type, (session.user as any).id, targetUserId);
  return NextResponse.json({ code });
}
