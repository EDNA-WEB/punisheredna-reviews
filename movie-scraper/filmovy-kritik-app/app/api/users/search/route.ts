import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { checkIpRateLimit } from '@/lib/ipRateLimit';

export async function GET(req: Request) {
  if (!checkIpRateLimit(req, 'search-users', 10_000, 20)) {
    return NextResponse.json({ error: 'Príliš veľa vyhľadávaní za krátky čas.' }, { status: 429 });
  }

  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json([]);

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get('q') || '').trim();
  if (q.length < 2) return NextResponse.json([]);

  const myId = (session.user as any).id;
  const users = await prisma.user.findMany({
    where: { name: { contains: q, mode: 'insensitive' }, id: { not: myId }, banned: false },
    take: 8,
    select: { id: true, name: true, avatar: true, role: true, membershipUntil: true }
  });

  return NextResponse.json(users);
}
