import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// Rovnaký výber ako na hlavnej stránke webu (app/page.tsx) — len trailery,
// čo administrátor konkrétne označil "featuredOnHome", nie ktorýkoľvek film
// s vyplneným trailerom. Vracia aj vlastný náhľadový obrázok, ak ho web má
// nastavený (previewImage), namiesto vždy len generického YouTube náhľadu.
export async function GET() {
  try {
    const trailers = await prisma.movieVideo.findMany({
      where: { category: 'trailer', featuredOnHome: true, episodeId: null, seasonId: null, movie: { approved: true } },
      orderBy: { createdAt: 'desc' },
      take: 6,
      select: {
        id: true,
        url: true,
        title: true,
        previewImage: true,
        movie: { select: { title: true, poster: true } }
      }
    });

    return NextResponse.json(trailers, { status: 200 });
  } catch (error) {
    console.error('[api/mobile/trailers]', error);
    return NextResponse.json({ error: 'Chyba pri načítaní trailerov.' }, { status: 500 });
  }
}
