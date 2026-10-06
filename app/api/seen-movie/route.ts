import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// „Viděl jsem“ — označenie filmu ako videného (web). POST = označiť, DELETE = zrušiť.
async function handle(req: Request, seen: boolean) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id as string | undefined;
  if (!userId) return NextResponse.json({ error: 'Musíš být přihlášen.' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const movieId = typeof body?.movieId === 'string' ? body.movieId.slice(0, 64) : '';
  if (!movieId) return NextResponse.json({ error: 'Chybí movieId.' }, { status: 400 });
  if (seen) await prisma.seenMovie.upsert({ where: { userId_movieId: { userId, movieId } }, create: { userId, movieId }, update: {} });
  else await prisma.seenMovie.deleteMany({ where: { userId, movieId } });
  return NextResponse.json({ ok: true, seen });
}
export const POST = (req: Request) => handle(req, true);
export const DELETE = (req: Request) => handle(req, false);
