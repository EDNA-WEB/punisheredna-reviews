import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireMobileAdmin } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';

// Filmy / osobnosti čakajúce na schválenie. ?type=movies | people
export async function GET(req: Request) {
  if (!(await requireMobileAdmin(req))) return NextResponse.json({ error: 'Nemáš oprávnění.' }, { status: 403 });
  const type = new URL(req.url).searchParams.get('type') === 'people' ? 'people' : 'movies';
  if (type === 'movies') {
    const items = await prisma.movie.findMany({
      where: { approved: false },
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: { id: true, title: true, slug: true, poster: true, year: true, contentType: true, genres: true, createdAt: true, submittedBy: { select: { id: true, name: true } } }
    });
    return NextResponse.json({ items });
  }
  const items = await prisma.person.findMany({
    where: { approved: false },
    orderBy: { createdAt: 'desc' },
    take: 100,
    select: { id: true, name: true, slug: true, photo: true, role: true, subRole: true, createdAt: true, submittedBy: { select: { id: true, name: true } } }
  });
  return NextResponse.json({ items });
}
