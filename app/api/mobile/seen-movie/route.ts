import { NextResponse } from 'next/server';
import { getMobileUser } from '@/lib/mobileAuth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// „Viděl jsem“ pre appku. POST = označiť, DELETE = zrušiť (telo { movieId }).
async function handle(req: Request, seen: boolean) {
  const me = await getMobileUser(req);
  if (!me) return NextResponse.json({ error: 'Neplatné nebo vypršelé přihlášení.' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const movieId = typeof body?.movieId === 'string' ? body.movieId.slice(0, 64) : '';
  if (!movieId) return NextResponse.json({ error: 'Chybí movieId.' }, { status: 400 });
  if (seen) await prisma.seenMovie.upsert({ where: { userId_movieId: { userId: me.id, movieId } }, create: { userId: me.id, movieId }, update: {} });
  else await prisma.seenMovie.deleteMany({ where: { userId: me.id, movieId } });
  return NextResponse.json({ ok: true, seen });
}
export const POST = (req: Request) => handle(req, true);
export const DELETE = (req: Request) => handle(req, false);
