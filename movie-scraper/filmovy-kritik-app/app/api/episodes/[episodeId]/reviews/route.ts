import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { looksLikeSpam, checkRateLimit } from '@/lib/antiSpam';

export async function POST(req: Request, { params }: { params: { episodeId: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Na napísanie recenzie sa musíš prihlásiť.' }, { status: 401 });

    const authorId = (session.user as any).id;
    const user = await prisma.user.findUnique({ where: { id: authorId } });
    if (!user || user.banned) return NextResponse.json({ error: 'Tvoj účet bol zablokovaný.' }, { status: 403 });
    if (user.reviewsDisabled) return NextResponse.json({ error: 'Administrátor ti obmedzil možnosť pridávať recenzie.' }, { status: 403 });
    const rateLimitError = await checkRateLimit('review', authorId, user.createdAt);
    if (rateLimitError) return NextResponse.json({ error: rateLimitError }, { status: 429 });

    const data = await req.json();
    if (!data.body || !String(data.body).trim()) {
      return NextResponse.json({ error: 'Text recenzie nemôže byť prázdny.' }, { status: 400 });
    }
    if (String(data.body).length > 20000) {
      return NextResponse.json({ error: 'Text recenzie je príliš dlhý (max. 20 000 znakov).' }, { status: 400 });
    }
    const spamReason = looksLikeSpam(String(data.body));
    if (spamReason) return NextResponse.json({ error: spamReason }, { status: 400 });

    const episode = await prisma.episode.findUnique({ where: { id: params.episodeId }, include: { season: true } });
    if (!episode) return NextResponse.json({ error: 'Epizóda sa nenašla.' }, { status: 404 });
    if (!episode.season.released) {
      return NextResponse.json({ error: 'Táto epizóda ešte nevyšla, zatiaľ na ňu nemôžeš napísať recenziu.' }, { status: 403 });
    }

    const existing = await prisma.review.findFirst({
      where: { movieId: episode.season.movieId, authorId, seasonId: episode.seasonId, episodeId: episode.id }
    });
    if (existing) {
      return NextResponse.json({ error: 'K tejto epizóde už recenziu máš.', existingId: existing.id }, { status: 409 });
    }

    const review = await prisma.$transaction(async (tx) => {
      const created = await tx.review.create({
        data: { movieId: episode.season.movieId, seasonId: episode.seasonId, episodeId: episode.id, body: String(data.body).trim(), authorId }
      });

      if (data.rating && Number(data.rating) > 0) {
        const existingRating = await tx.rating.findFirst({
          where: { movieId: episode.season.movieId, userId: authorId, seasonId: episode.seasonId, episodeId: episode.id }
        });
        if (existingRating) {
          await tx.rating.update({ where: { id: existingRating.id }, data: { value: Number(data.rating) } });
        } else {
          await tx.rating.create({
            data: { movieId: episode.season.movieId, userId: authorId, seasonId: episode.seasonId, episodeId: episode.id, value: Number(data.rating) }
          });
        }
      }

      return created;
    });

    return NextResponse.json(review, { status: 201 });
  } catch (err: any) {
    if (err?.code === 'P2002') return NextResponse.json({ error: 'Táto akcia už bola vykonaná.' }, { status: 409 });
    return NextResponse.json({ error: 'Požiadavka zlyhala. Skús to prosím znova.' }, { status: 400 });
  }
}
