import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Nemáš oprávnenie na túto akciu.' }, { status: 403 });
  }

  const body = await req.json();
  const data: Record<string, any> = {};
  if ('hasSubtitles' in body) data.hasSubtitles = !!body.hasSubtitles;
  if ('hasDubbing' in body) data.hasDubbing = !!body.hasDubbing;

  const movie = await prisma.movie.updateMany({ where: { id: params.id }, data });
  if (movie.count === 0) return NextResponse.json({ error: 'Film sa nenašiel.' }, { status: 404 });

  return NextResponse.json({ ok: true });
}
