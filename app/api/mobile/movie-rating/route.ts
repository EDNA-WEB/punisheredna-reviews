import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getMobileUser } from '@/lib/mobileAuth';
import { checkRateLimit } from '@/lib/antiSpam';
import { computeBlendedPercent, scoreColorStyle } from '@/lib/rating';

export const dynamic = 'force-dynamic';

// Rovnaké pravidlá ako web (app/api/ratings): 0,5–5 po polovičkách, blokovaný
// účet / zakázané hodnotenie, rate limit, žiadne hodnotenie pred premiérou.
// Navyše vracia nové percento, aby appka hneď ukázala aktuálny stav bez
// opätovného načítania celého profilu (cache filmu sa obnovuje po 60 s).
async function freshStats(movieId: string) {
  const [movie, ratings] = await Promise.all([
    prisma.movie.findUnique({ where: { id: movieId }, select: { tmdbVoteAverage: true, tmdbVoteCount: true } }),
    prisma.rating.findMany({ where: { movieId, seasonId: null, episodeId: null }, select: { value: true } })
  ]);
  const percent = computeBlendedPercent(ratings, movie?.tmdbVoteAverage ?? null, movie?.tmdbVoteCount ?? null);
  return { percent, percentColor: scoreColorStyle(percent).backgroundColor, ratingsCount: ratings.length };
}

export async function POST(req: Request) {
  try {
    const user = await getMobileUser(req);
    if (!user) return NextResponse.json({ error: 'Neplatné nebo vypršelé přihlášení.' }, { status: 401 });
    if (user.ratingsDisabled) {
      return NextResponse.json({ error: 'Administrátor ti omezil možnost hodnotit filmy.' }, { status: 403 });
    }
    const rateLimitError = await checkRateLimit('rating', user.id, user.createdAt);
    if (rateLimitError) return NextResponse.json({ error: rateLimitError }, { status: 429 });

    const { movieId, value } = await req.json();
    const v = Number(value);
    if (!movieId || !(v >= 0.5 && v <= 5 && v % 0.5 === 0)) {
      return NextResponse.json({ error: 'Neplatné hodnocení.' }, { status: 400 });
    }

    const movie = await prisma.movie.findUnique({ where: { id: movieId }, select: { releaseDate: true } });
    if (!movie) return NextResponse.json({ error: 'Film se nenašel.' }, { status: 404 });
    if (movie.releaseDate && movie.releaseDate > new Date()) {
      return NextResponse.json({ error: 'Film ještě neměl premiéru, zatím ho nemůžeš hodnotit.' }, { status: 403 });
    }

    const existing = await prisma.rating.findFirst({ where: { movieId, userId: user.id, seasonId: null, episodeId: null } });
    if (existing) await prisma.rating.update({ where: { id: existing.id }, data: { value: v } });
    else await prisma.rating.create({ data: { movieId, userId: user.id, value: v } });

    return NextResponse.json({ myRating: v, ...(await freshStats(movieId)) }, { status: 200 });
  } catch (error) {
    console.error('[api/mobile/movie-rating POST]', error);
    return NextResponse.json({ error: 'Hodnocení se nepodařilo uložit.' }, { status: 400 });
  }
}

export async function DELETE(req: Request) {
  try {
    const user = await getMobileUser(req);
    if (!user) return NextResponse.json({ error: 'Neplatné nebo vypršelé přihlášení.' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const movieId = searchParams.get('movieId');
    if (!movieId) return NextResponse.json({ error: 'Chýba movieId.' }, { status: 400 });

    await prisma.rating.deleteMany({ where: { movieId, userId: user.id, seasonId: null, episodeId: null } });
    return NextResponse.json({ myRating: null, ...(await freshStats(movieId)) }, { status: 200 });
  } catch (error) {
    console.error('[api/mobile/movie-rating DELETE]', error);
    return NextResponse.json({ error: 'Smazání selhalo.' }, { status: 400 });
  }
}
