import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { checkRateLimit } from '@/lib/antiSpam';

export async function POST(req: Request, { params }: { params: { episodeId: string } }) {
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

  const episode = await prisma.episode.findUnique({ where: { id: params.episodeId }, include: { season: true } });
  if (!episode) return NextResponse.json({ error: 'Epizóda sa nenašla.' }, { status: 404 });
  if (!episode.season.released) {
    return NextResponse.json({ error: 'Táto epizóda ešte nevyšla, zatiaľ ju nemôžeš hodnotiť.' }, { status: 403 });
  }

  const existingRating = await prisma.rating.findFirst({
    where: { movieId: episode.season.movieId, userId, seasonId: episode.seasonId, episodeId: episode.id }
  });
  const rating = existingRating
    ? await prisma.rating.update({ where: { id: existingRating.id }, data: { value: v } })
    : await prisma.rating.create({
        data: { movieId: episode.season.movieId, userId, seasonId: episode.seasonId, episodeId: episode.id, value: v }
      });

  return NextResponse.json(rating);
}

export async function DELETE(req: Request, { params }: { params: { episodeId: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Musíš byť prihlásený.' }, { status: 401 });
  const userId = (session.user as any).id;
  await prisma.rating.deleteMany({ where: { episodeId: params.episodeId, userId } });
  return NextResponse.json({ ok: true });
}
