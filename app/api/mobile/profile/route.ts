import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getMobileUser } from '@/lib/mobileAuth';
import { getCountryFlagUrl } from '@/lib/countryFlags';

export const dynamic = 'force-dynamic';

// Zjednodušená appková verzia webovej profilovej stránky — základné údaje,
// štatistiky, posledné recenzie a hodnotenia. (Blog príspevky a filmové
// zoznamy zatiaľ appka nezobrazuje, to je zatiaľ len na webe.)
export async function GET(req: Request) {
  try {
    const authUser = await getMobileUser(req);
    if (!authUser) return NextResponse.json({ error: 'Neplatné alebo vypršané prihlásenie.' }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { id: authUser.id },
      select: {
        id: true,
        name: true,
        avatar: true,
        bio: true,
        tagline: true,
        role: true,
        isEditor: true,
        country: true,
        region: true,
        _count: { select: { comments: true, reviews: true, followedBy: true, following: true, ratings: true } }
      }
    });
    if (!user) return NextResponse.json({ error: 'Uživatel se nenašel.' }, { status: 404 });

    const [reviews, ratings, followersPreview, karma, genreRatings] = await Promise.all([
      prisma.review.findMany({
        where: { authorId: user.id },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          body: true,
          createdAt: true,
          movieId: true,
          seasonId: true,
          episodeId: true,
          movie: { select: { title: true, slug: true, poster: true } },
          season: { select: { number: true } },
          episode: { select: { number: true, title: true } }
        }
      }),
      prisma.rating.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          value: true,
          createdAt: true,
          movie: { select: { title: true, slug: true, poster: true } },
          season: { select: { number: true } },
          episode: { select: { number: true, title: true } }
        }
      }),
      prisma.follow.findMany({
        where: { followingId: user.id },
        orderBy: { createdAt: 'desc' },
        take: 2,
        select: { follower: { select: { avatar: true } } }
      }),
      prisma.like.aggregate({
        where: {
          OR: [{ review: { authorId: user.id } }, { comment: { userId: user.id } }, { post: { authorId: user.id } }, { news: { authorId: user.id } }]
        },
        _sum: { value: true }
      }),
      prisma.rating.findMany({ where: { userId: user.id }, select: { movie: { select: { genres: true } } } })
    ]);

    const genreCountMap = new Map<string, number>();
    for (const r of genreRatings) {
      const genres = (r.movie.genres || '').split(',').map((g) => g.trim()).filter(Boolean);
      for (const g of genres) genreCountMap.set(g, (genreCountMap.get(g) || 0) + 1);
    }
    const topGenres = Array.from(genreCountMap.entries())
      .map(([genre, count]) => ({ genre, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    function buildDisplayTitle(movieTitle: string, season: { number: number } | null, episode: { number: number; title: string | null } | null) {
      if (episode && season) return `${movieTitle} - S${season.number}E${episode.number}${episode.title ? `: ${episode.title}` : ''}`;
      if (season) return `${movieTitle} - Sezóna ${season.number}`;
      return movieTitle;
    }

    const reviewsWithTitle = reviews.map((r) => ({
      id: r.id,
      body: r.body,
      createdAt: r.createdAt,
      movie: { ...r.movie, displayTitle: buildDisplayTitle(r.movie.title, r.season, r.episode) }
    }));
    const ratingsWithTitle = ratings.map((r) => ({
      id: r.id,
      value: r.value,
      createdAt: r.createdAt,
      movie: { ...r.movie, displayTitle: buildDisplayTitle(r.movie.title, r.season, r.episode) }
    }));

    const flag = user.country ? getCountryFlagUrl(user.country) : null;

    return NextResponse.json(
      {
        ...user,
        flagUrl: flag?.url ?? null,
        flagCountryName: flag?.countryName ?? user.country,
        followersPreview: followersPreview.map((f) => f.follower.avatar),
        karma: karma._sum.value || 0,
        topGenres,
        reviews: reviewsWithTitle,
        ratings: ratingsWithTitle
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[api/mobile/profile]', error);
    return NextResponse.json({ error: 'Chyba při načítání profilu.' }, { status: 500 });
  }
}
