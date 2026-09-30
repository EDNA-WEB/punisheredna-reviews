import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getMobileUser } from '@/lib/mobileAuth';
import { checkIpRateLimit } from '@/lib/ipRateLimit';
import { looksLikeSpam, checkRateLimit } from '@/lib/antiSpam';
import { logActivity } from '@/lib/logActivity';

import { hasInjectedObject } from '@/lib/inputGuard';
export const dynamic = 'force-dynamic';

// Jednotný endpoint appky — sám zistí, či autor už na tento film recenziu
// má (potom ju upraví), alebo nie (potom ju vytvorí). Rovnaká logika ako
// web (app/api/reviews), len zjednotená do jedného POST namiesto
// POST+PUT na dvoch rôznych cestách.
export async function POST(req: Request) {
  try {
    const authUser = await getMobileUser(req);
    if (!authUser) return NextResponse.json({ error: 'Neplatné nebo vypršelé přihlášení.' }, { status: 401 });
    if (!checkIpRateLimit(req, 'reviews-create', 60_000, 5)) {
      return NextResponse.json({ error: 'Příliš mnoho recenzí za krátký čas. Zkus to prosím za chvíli znovu.' }, { status: 429 });
    }

    const user = await prisma.user.findUnique({ where: { id: authUser.id } });
    if (!user || user.banned) return NextResponse.json({ error: 'Tvůj účet byl zablokován.' }, { status: 403 });
    if (user.reviewsDisabled) return NextResponse.json({ error: 'Administrátor ti omezil možnost přidávat recenze.' }, { status: 403 });

    const { movieId, body, rating } = await req.json();
    if (hasInjectedObject(movieId)) return NextResponse.json({ error: 'Neplatné údaje.' }, { status: 400 });
    if (!movieId) return NextResponse.json({ error: 'Vyber prosím film.' }, { status: 400 });
    if (!body || !String(body).trim()) return NextResponse.json({ error: 'Text recenze nemůže být prázdný.' }, { status: 400 });
    if (String(body).length > 20000) return NextResponse.json({ error: 'Text recenze je příliš dlouhý (max. 20 000 znaků).' }, { status: 400 });

    const spamReason = looksLikeSpam(String(body));
    if (spamReason) return NextResponse.json({ error: spamReason }, { status: 400 });

    const movie = await prisma.movie.findUnique({ where: { id: movieId } });
    if (!movie) return NextResponse.json({ error: 'Film se nenašel.' }, { status: 404 });

    const existing = await prisma.review.findFirst({ where: { movieId, authorId: user.id, seasonId: null, episodeId: null } });

    let review;
    if (existing) {
      review = await prisma.review.update({ where: { id: existing.id }, data: { body: String(body).trim() } });
    } else {
      const rateLimitError = await checkRateLimit('review', user.id, user.createdAt);
      if (rateLimitError) return NextResponse.json({ error: rateLimitError }, { status: 429 });
      review = await prisma.review.create({ data: { movieId, body: String(body).trim(), authorId: user.id } });
    }

    if (rating && Number(rating) > 0) {
      const existingRating = await prisma.rating.findFirst({ where: { movieId, userId: user.id, seasonId: null, episodeId: null } });
      if (existingRating) await prisma.rating.update({ where: { id: existingRating.id }, data: { value: Number(rating) } });
      else await prisma.rating.create({ data: { movieId, userId: user.id, value: Number(rating) } });
    }

    if (!existing) {
      logActivity(user.id, `Recenzia filmu ${movie.title}`, `/movie/${movie.slug}`);
      const fans = await prisma.follow.findMany({ where: { followingId: user.id }, select: { followerId: true } });
      if (fans.length > 0) {
        await prisma.notification.createMany({
          data: fans.map((f) => ({
            userId: f.followerId,
            actorName: user.name,
            type: 'REVIEW',
            text: `${user.name} přidal(a) novou recenzi: ${movie.title}`,
            link: `/movie/${movie.slug}`
          }))
        });
      }
    }

    return NextResponse.json({ id: review.id, body: review.body, isNew: !existing }, { status: existing ? 200 : 201 });
  } catch (error) {
    console.error('[api/mobile/movie-review]', error);
    return NextResponse.json({ error: 'Požadavek selhal. Zkus to prosím znovu.' }, { status: 400 });
  }
}
