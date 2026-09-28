import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCzCinemaDates } from '@/lib/moviePercents';

export const dynamic = 'force-dynamic';

// Rovnaký výber ako na hlavnej stránke webu (app/page.tsx) — len trailery,
// čo administrátor konkrétne označil "featuredOnHome", nie ktorýkoľvek film
// s vyplneným trailerom. Vracia aj vlastný náhľadový obrázok, ak ho web má
// nastavený (previewImage), namiesto vždy len generického YouTube náhľadu.
// Navyše: dátum českej kinopremiéry (inak všeobecný dátum premiéry filmu),
// aby appka v zozname trailerov ukázala, čo už "Po premiéře".
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
        movie: { select: { id: true, title: true, slug: true, poster: true, releaseDate: true } }
      }
    });

    const czDates = await getCzCinemaDates(trailers.map((t) => t.movie.id));
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const result = trailers.map((t) => {
      const premiere = czDates[t.movie.id] || t.movie.releaseDate || null;
      return { ...t, premiereDate: premiere, isCzPremiere: !!czDates[t.movie.id], isReleased: !!premiere && new Date(premiere) <= new Date() };
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error('[api/mobile/trailers]', error);
    return NextResponse.json({ error: 'Chyba pri načítaní trailerov.' }, { status: 500 });
  }
}
