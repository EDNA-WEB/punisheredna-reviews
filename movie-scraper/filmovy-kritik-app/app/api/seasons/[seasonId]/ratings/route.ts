import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { checkRateLimit } from '@/lib/antiSpam';

export async function POST(req: Request, { params }: { params: { seasonId: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Musíš byť prihlásený.' }, { status: 401 });

  const userId = (session.user as any).id;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.banned) return NextResponse.json({ error: 'Tvoj účet bol zablokovaný.' }, { status: 403 });
  if (user.ratingsDisabled) return NextResponse.json({ error: 'Administrátor ti obmedzil možnosť hodnotiť.' }, { status: 403 });
  const rateLimitError = await checkRateLimit('rating', userId, user.createdAt);
  if (rateLimitError) return NextResponse.json({ error: rateLimitError }, { status: 429 });

  const { value } = await req.json();
  const v = Number(value);
  if (!(v >= 0.5 && v <= 5 && v % 0.5 === 0)) {
    return NextResponse.json({ error: 'Neplatné hodnotenie.' }, { status: 400 });
  }

  const season = await prisma.season.findUnique({ where: { id: params.seasonId } });
  if (!season) return NextResponse.json({ error: 'Séria sa nenašla.' }, { status: 404 });
  if (!season.released) {
    return NextResponse.json({ error: 'Táto séria ešte nevyšla, zatiaľ ju nemôžeš hodnotiť.' }, { status: 403 });
  }

  const existingRating = await prisma.rating.findFirst({
    where: { movieId: season.movieId, userId, seasonId: season.id, episodeId: null }
  });
  const rating = existingRating
    ? await prisma.rating.update({ where: { id: existingRating.id }, data: { value: v } })
    : await prisma.rating.create({ data: { movieId: season.movieId, userId, seasonId: season.id, value: v } });

  return NextResponse.json(rating);
}

export async function DELETE(req: Request, { params }: { params: { seasonId: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Musíš byť prihlásený.' }, { status: 401 });
  const userId = (session.user as any).id;
  await prisma.rating.deleteMany({ where: { seasonId: params.seasonId, userId, episodeId: null } });
  return NextResponse.json({ ok: true });
}
