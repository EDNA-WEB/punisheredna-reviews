import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logActivity } from '@/lib/logActivity';
import { looksLikeSpam, checkRateLimit } from '@/lib/antiSpam';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Na napísanie recenzie sa musíš prihlásiť.' }, { status: 401 });
    }
    const authorId = (session.user as any).id;
    const user = await prisma.user.findUnique({ where: { id: authorId } });
    if (!user || user.banned) {
      return NextResponse.json({ error: 'Tvoj účet bol zablokovaný, nemôžeš pridávať recenzie.' }, { status: 403 });
    }
    if (user.reviewsDisabled) {
      return NextResponse.json({ error: 'Administrátor ti obmedzil možnosť pridávať recenzie.' }, { status: 403 });
    }
    const rateLimitError = await checkRateLimit('review', authorId, user.createdAt);
    if (rateLimitError) return NextResponse.json({ error: rateLimitError }, { status: 429 });

    const data = await req.json();
    if (!data.movieId) {
      return NextResponse.json({ error: 'Vyber prosím film.' }, { status: 400 });
    }
    if (!data.body || !String(data.body).trim()) {
      return NextResponse.json({ error: 'Text recenzie nemôže byť prázdny.' }, { status: 400 });
    }
    if (String(data.body).length > 20000) {
      return NextResponse.json({ error: 'Text recenzie je príliš dlhý (max. 20 000 znakov).' }, { status: 400 });
    }

    const spamReason = looksLikeSpam(String(data.body));
    if (spamReason) return NextResponse.json({ error: spamReason }, { status: 400 });

    const movie = await prisma.movie.findUnique({ where: { id: data.movieId } });
    if (!movie) return NextResponse.json({ error: 'Film sa nenašiel.' }, { status: 404 });
    if (movie.releaseDate && movie.releaseDate > new Date()) {
      return NextResponse.json({ error: 'Film ešte nemal premiéru, zatiaľ naň nemôžeš napísať recenziu.' }, { status: 403 });
    }

    const existing = await prisma.review.findFirst({
      where: { movieId: data.movieId, authorId, seasonId: null, episodeId: null }
    });
    if (existing) {
      return NextResponse.json(
        { error: 'K tomuto filmu už recenziu máš. Môžeš ju iba upraviť, nie pridať druhú.', existingId: existing.id },
        { status: 409 }
      );
    }

    const review = await prisma.$transaction(async (tx) => {
      const created = await tx.review.create({
        data: { movieId: data.movieId, body: String(data.body).trim(), authorId }
      });

      if (data.rating && Number(data.rating) > 0) {
        const existingRating = await tx.rating.findFirst({ where: { movieId: data.movieId, userId: authorId, seasonId: null, episodeId: null } });
        if (existingRating) {
          await tx.rating.update({ where: { id: existingRating.id }, data: { value: Number(data.rating) } });
        } else {
          await tx.rating.create({ data: { movieId: data.movieId, userId: authorId, value: Number(data.rating) } });
        }
      }

      return created;
    });

    logActivity(authorId, `Recenzia filmu ${movie.title}`, `/movie/${movie.slug}`);

    const author = await prisma.user.findUnique({ where: { id: authorId }, select: { name: true } });
    const fans = await prisma.follow.findMany({ where: { followingId: authorId }, select: { followerId: true } });
    if (fans.length > 0 && author) {
      await prisma.notification.createMany({
        data: fans.map((f) => ({
          userId: f.followerId,
          actorName: author.name,
          type: 'REVIEW',
          text: `${author.name} pridal(a) novú recenziu: ${movie.title}`,
          link: `/movie/${movie.slug}`
        }))
      });
    }

    return NextResponse.json(review, { status: 201 });
  } catch (err: any) {
    if (err?.code === 'P2002') {
      return NextResponse.json({ error: 'Táto akcia sa už spracováva alebo bola vykonaná.' }, { status: 409 });
    }
    console.error(err);
    return NextResponse.json({ error: 'Požiadavka zlyhala. Skús to prosím znova.' }, { status: 400 });
  }
}
