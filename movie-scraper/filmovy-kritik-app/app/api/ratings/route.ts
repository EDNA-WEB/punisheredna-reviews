import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { checkRateLimit } from '@/lib/antiSpam';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Musíš byť prihlásený.' }, { status: 401 });

  const userId = (session.user as any).id;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.banned) {
    return NextResponse.json({ error: 'Tvoj účet bol zablokovaný.' }, { status: 403 });
  }
  if (user.ratingsDisabled) {
    return NextResponse.json({ error: 'Administrátor ti obmedzil možnosť hodnotiť filmy.' }, { status: 403 });
  }
  const rateLimitError = await checkRateLimit('rating', userId, user.createdAt);
  if (rateLimitError) return NextResponse.json({ error: rateLimitError }, { status: 429 });

  const { movieId, value } = await req.json();
  const v = Number(value);
  if (!movieId || !(v >= 0.5 && v <= 5 && v % 0.5 === 0)) {
    return NextResponse.json({ error: 'Neplatné hodnotenie.' }, { status: 400 });
  }

  const movie = await prisma.movie.findUnique({ where: { id: movieId }, select: { releaseDate: true } });
  if (!movie) return NextResponse.json({ error: 'Film sa nenašiel.' }, { status: 404 });
  if (movie.releaseDate && movie.releaseDate > new Date()) {
    return NextResponse.json({ error: 'Film ešte nemal premiéru, zatiaľ ho nemôžeš hodnotiť.' }, { status: 403 });
  }

  const existingRating = await prisma.rating.findFirst({ where: { movieId, userId, seasonId: null, episodeId: null } });
  const rating = existingRating
    ? await prisma.rating.update({ where: { id: existingRating.id }, data: { value: v } })
    : await prisma.rating.create({ data: { movieId, userId, value: v } });

  return NextResponse.json(rating);
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Musíš byť prihlásený.' }, { status: 401 });

  const userId = (session.user as any).id;
  const { movieId } = await req.json();

  await prisma.rating.deleteMany({ where: { movieId, userId, seasonId: null, episodeId: null } });
  return NextResponse.json({ ok: true });
}
