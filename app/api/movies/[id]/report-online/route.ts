import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { params } = { ...ctx, params: await ctx.params };
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Pro nahlášení se musíš přihlásit.' }, { status: 401 });

  const movie = await prisma.movie.findUnique({ where: { id: params.id }, select: { id: true } });
  if (!movie) return NextResponse.json({ error: 'Film se nenašel.' }, { status: 404 });

  const { note } = await req.json().catch(() => ({ note: null }));
  const trimmedNote = typeof note === 'string' ? note.trim().slice(0, 500) : null;

  await prisma.onlineReport.create({
    data: {
      movieId: movie.id,
      reporterId: (session.user as any).id,
      note: trimmedNote || null
    }
  });

  return NextResponse.json({ ok: true });
}
