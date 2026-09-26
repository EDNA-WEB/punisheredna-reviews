import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getMobileUser } from '@/lib/mobileAuth';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const me = await getMobileUser(req);
    if (!me) return NextResponse.json({ error: 'Neplatné alebo vypršané prihlásenie.' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Chýba id.' }, { status: 400 });

    const review = await prisma.review.findUnique({ where: { id } });
    if (!review || review.authorId !== me.id) return NextResponse.json({ error: 'Recenze se nenašla.' }, { status: 404 });

    const rating = await prisma.rating.findFirst({
      where: { movieId: review.movieId, userId: me.id, seasonId: review.seasonId, episodeId: review.episodeId },
      select: { value: true }
    });

    return NextResponse.json({ id: review.id, body: review.body, rating: rating?.value ?? null }, { status: 200 });
  } catch (error) {
    console.error('[api/mobile/review-by-id]', error);
    return NextResponse.json({ error: 'Chyba při načítání.' }, { status: 500 });
  }
}
