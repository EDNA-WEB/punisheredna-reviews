import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { isActiveMember } from '@/lib/membership';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Musíš byť prihlásený.' }, { status: 401 });
  const userId = (session.user as any).id;

  const isAdmin = (session.user as any).role === 'ADMIN';
  if (!isAdmin && !(await isActiveMember(userId))) {
    return NextResponse.json({ error: 'Vytváření vlastních seznamů je dostupné jen pro Golden Ticket členy.' }, { status: 403 });
  }

  const { title } = await req.json();
  const trimmedTitle = String(title || '').trim();
  if (!trimmedTitle) return NextResponse.json({ error: 'Vyplň prosím název seznamu.' }, { status: 400 });
  if (trimmedTitle.length > 120) return NextResponse.json({ error: 'Název je příliš dlouhý (max. 120 znaků).' }, { status: 400 });

  const count = await prisma.movieList.count({ where: { authorId: userId } });
  if (count >= 50) return NextResponse.json({ error: 'Máš už maximální počet seznamů (50).' }, { status: 400 });

  const list = await prisma.movieList.create({ data: { authorId: userId, title: trimmedTitle } });
  return NextResponse.json({ id: list.id, title: list.title });
}
