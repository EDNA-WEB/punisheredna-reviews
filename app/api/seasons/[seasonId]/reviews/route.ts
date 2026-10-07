import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { parseRatingValue, RATINGS_DISABLED_MESSAGE } from '@/lib/ratingValue';
import { looksLikeSpam, checkRateLimit } from '@/lib/antiSpam';

export async function POST(req: Request, ctx: { params: Promise<{ seasonId: string }> }) {
  const { params } = { ...ctx, params: await ctx.params };
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Pro napsání recenze se musíš přihlásit.' }, { status: 401 });

    const authorId = (session.user as any).id;
    const user = await prisma.user.findUnique({ where: { id: authorId } });
    if (!user || user.banned) return NextResponse.json({ error: 'Tvůj účet byl zablokován.' }, { status: 403 });
    if (user.reviewsDisabled) return NextResponse.json({ error: 'Administrátor ti omezil možnost přidávat recenze.' }, { status: 403 });
    const rateLimitError = await checkRateLimit('review', authorId, user.createdAt);
    if (rateLimitError) return NextResponse.json({ error: rateLimitError }, { status: 429 });

    const data = await req.json();
    if (!data.body || !String(data.body).trim()) {
      return NextResponse.json({ error: 'Text recenze nemůže být prázdný.' }, { status: 400 });
    }
    if (String(data.body).length > 20000) {
      return NextResponse.json({ error: 'Text recenze je příliš dlouhý (max. 20 000 znaků).' }, { status: 400 });
    }
    // Bezpečnosť: hodnotenie len 0,5 – 5 a len ak ho admin používateľovi nezakázal.
    const ratingParsed = parseRatingValue(data.rating);
    if (ratingParsed.error) return NextResponse.json({ error: ratingParsed.error }, { status: 400 });
    if (ratingParsed.value !== null && user.ratingsDisabled) return NextResponse.json({ error: RATINGS_DISABLED_MESSAGE }, { status: 403 });
    const ratingValue = ratingParsed.value;
    const spamReason = looksLikeSpam(String(data.body));
    if (spamReason) return NextResponse.json({ error: spamReason }, { status: 400 });

    const season = await prisma.season.findUnique({ where: { id: params.seasonId } });
    if (!season) return NextResponse.json({ error: 'Série se nenašla.' }, { status: 404 });
    if (!season.released) {
      return NextResponse.json({ error: 'Tato série ještě nevyšla, zatím na ni nemůžeš napsat recenzi.' }, { status: 403 });
    }

    const existing = await prisma.review.findFirst({
      where: { movieId: season.movieId, authorId, seasonId: season.id, episodeId: null }
    });
    if (existing) {
      return NextResponse.json({ error: 'K této sérii už recenzi máš.', existingId: existing.id }, { status: 409 });
    }

    const review = await prisma.$transaction(async (tx) => {
      const created = await tx.review.create({
        data: { movieId: season.movieId, seasonId: season.id, body: String(data.body).trim(), authorId }
      });

      if (ratingValue !== null) {
        const existingRating = await tx.rating.findFirst({ where: { movieId: season.movieId, userId: authorId, seasonId: season.id, episodeId: null } });
        if (existingRating) {
          await tx.rating.update({ where: { id: existingRating.id }, data: { value: ratingValue } });
        } else {
          await tx.rating.create({ data: { movieId: season.movieId, userId: authorId, seasonId: season.id, value: ratingValue } });
        }
      }

      return created;
    });

    return NextResponse.json(review, { status: 201 });
  } catch (err: any) {
    if (err?.code === 'P2002') return NextResponse.json({ error: 'Tato akce už byla provedena.' }, { status: 409 });
    return NextResponse.json({ error: 'Požadavek selhal. Zkus to prosím znovu.' }, { status: 400 });
  }
}
