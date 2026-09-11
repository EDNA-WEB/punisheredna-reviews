import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Nemáš oprávnenie na túto akciu.' }, { status: 403 });
  }

  const csfdType = await prisma.movieLinkType.findUnique({ where: { name: 'ČSFD' } });

  const movies = await prisma.movie.findMany({
    where: { approved: true },
    orderBy: { createdAt: 'desc' },
    select: {
      title: true,
      year: true,
      _count: { select: { trivia: true } },
      links: csfdType ? { where: { linkTypeId: csfdType.id }, select: { url: true } } : false
    }
  });

  // Zoradíme podľa počtu zaujímavostí (najmenej navrch) a do zoznamu
  // zaradíme len filmy, čo majú priradený ČSFD odkaz — bez neho by riadok
  // v požadovanom tvare "Názov (Rok) – URL" nedával zmysel.
  const sorted = [...movies]
    .filter((m) => m.links && m.links.length > 0)
    .sort((a, b) => a._count.trivia - b._count.trivia);

  const lines = sorted.map((m) => `${m.title}${m.year ? ` (${m.year})` : ''} - ${m.links![0].url}`);
  const content = '\uFEFF' + lines.join('\n');

  return new NextResponse(content, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Content-Disposition': `attachment; filename="filmy-podla-poctu-zaujimavosti-${new Date().toISOString().slice(0, 10)}.txt"`
    }
  });
}
