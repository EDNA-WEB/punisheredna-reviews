import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { params } = { ...ctx, params: await ctx.params };
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Nemáš oprávnění k této akci.' }, { status: 403 });
  }

  const { text } = await req.json();
  if (!text || !String(text).trim()) return NextResponse.json({ error: 'Text nemůže být prázdný.' }, { status: 400 });
  if (String(text).length > 2000) return NextResponse.json({ error: 'Text je příliš dlouhý (max. 2000 znaků).' }, { status: 400 });

  const count = await prisma.movieTrivia.count({ where: { movieId: params.id } });
  if (count >= 50) {
    return NextResponse.json({ error: 'Zajímavostí může být nejvýše 50.' }, { status: 400 });
  }

  const trivia = await prisma.movieTrivia.create({
    data: { movieId: params.id, text: String(text).trim(), order: count }
  });

  return NextResponse.json({ id: trivia.id, text: trivia.text });
}
