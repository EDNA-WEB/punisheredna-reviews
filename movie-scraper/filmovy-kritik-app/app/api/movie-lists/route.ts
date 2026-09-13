import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Musíš byť prihlásený.' }, { status: 401 });
  const userId = (session.user as any).id;

  const { title } = await req.json();
  const trimmedTitle = String(title || '').trim();
  if (!trimmedTitle) return NextResponse.json({ error: 'Vyplň prosím názov zoznamu.' }, { status: 400 });
  if (trimmedTitle.length > 120) return NextResponse.json({ error: 'Názov je príliš dlhý (max. 120 znakov).' }, { status: 400 });

  const count = await prisma.movieList.count({ where: { authorId: userId } });
  if (count >= 50) return NextResponse.json({ error: 'Máš už maximálny počet zoznamov (50).' }, { status: 400 });

  const list = await prisma.movieList.create({ data: { authorId: userId, title: trimmedTitle } });
  return NextResponse.json({ id: list.id, title: list.title });
}
