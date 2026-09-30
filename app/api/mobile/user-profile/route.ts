import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getMobileUser } from '@/lib/mobileAuth';
import { getCountryFlagUrl } from '@/lib/countryFlags';

export const dynamic = 'force-dynamic';

// Rovnaká logika ako /api/mobile/profile, len pre CUDZÍ profil (podľa
// userId v query) — navyše rešpektuje nastavenie favoritesVisibility
// cieľového používateľa pre časti "obľúbené".
export async function GET(req: Request) {
  try {
    const me = await getMobileUser(req);
    if (!me) return NextResponse.json({ error: 'Neplatné nebo vypršelé přihlášení.' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    if (!userId) return NextResponse.json({ error: 'Chýba userId.' }, { status: 400 });

    const user = await prisma.user.findUnique({
      where: { id: userId },
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
        favoritesVisibility: true,
        _count: { select: { comments: true, reviews: true, followedBy: true, following: true, ratings: true } }
      }
    });
    if (!user) return NextResponse.json({ error: 'Uživatel se nenašel.' }, { status: 404 });

    const isFollowing = !!(await prisma.follow.findUnique({ where: { followerId_followingId: { followerId: me.id, followingId: userId } } }));

    const [reviews, ratings, karma, genreRatings] = await Promise.all([
      prisma.review.findMany({
        where: { authorId: user.id },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          body: true,
          createdAt: true,
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
          movie: { select: { title: true, slug: true, poster: true } },
          season: { select: { number: true } },
          episode: { select: { number: true, title: true } }
        }
      }),
      prisma.like.aggregate({
        where: {
          OR: [{ review: { authorId: user.id } }, { comment: { userId: user.id } }, { post: { authorId: user.id } }, { news: { authorId: user.id } }]
        },
        _sum: { value: true }
      }),
      prisma.rating.findMany({ where: { userId: user.id }, select: { movie: { select: { genres: true } } } })
    ]);

    function buildDisplayTitle(movieTitle: string, season: { number: number } | null, episode: { number: number; title: string | null } | null) {
      if (episode && season) return `${movieTitle} - S${season.number}E${episode.number}${episode.title ? `: ${episode.title}` : ''}`;
      if (season) return `${movieTitle} - Sezóna ${season.number}`;
      return movieTitle;
    }

    const genreCountMap = new Map<string, number>();
    for (const r of genreRatings) {
      const genres = (r.movie.genres || '').split(',').map((g) => g.trim()).filter(Boolean);
      for (const g of genres) genreCountMap.set(g, (genreCountMap.get(g) || 0) + 1);
    }
    const topGenres = Array.from(genreCountMap.entries())
      .map(([genre, count]) => ({ genre, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const flag = user.country ? getCountryFlagUrl(user.country) : null;

    // Ochrana súkromia "obľúbených" — ak si nastavil "iba mne" alebo "iba
    // oblúbeným" a ty nie si medzi jeho oblúbenými, appka tieto časti
    // jednoducho vynechá (frontend to zobrazí len ak přijde neprázdne).
    let canSeeFavorites = true;
    if (user.favoritesVisibility === 'ONLY_ME') canSeeFavorites = false;
    if (user.favoritesVisibility === 'LOGGED_IN') canSeeFavorites = true;
    if (user.favoritesVisibility === 'ONLY_FAVORITES') {
      canSeeFavorites = !!(await prisma.follow.findUnique({ where: { followerId_followingId: { followerId: userId, followingId: me.id } } }));
    }

    return NextResponse.json(
      {
        ...user,
        flagUrl: flag?.url ?? null,
        flagCountryName: flag?.countryName ?? user.country,
        karma: user.role === 'ADMIN' ? '∞' : karma._sum.value || 0,
        topGenres,
        isFollowing,
        canSeeFavorites,
        reviews: reviews.map((r) => ({ ...r, movie: { ...r.movie, displayTitle: buildDisplayTitle(r.movie.title, r.season, r.episode), seasonNumber: r.season?.number ?? null, episodeNumber: r.episode?.number ?? null } })),
        ratings: ratings.map((r) => ({ ...r, movie: { ...r.movie, displayTitle: buildDisplayTitle(r.movie.title, r.season, r.episode), seasonNumber: r.season?.number ?? null, episodeNumber: r.episode?.number ?? null } }))
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[api/mobile/user-profile]', error);
    return NextResponse.json({ error: 'Chyba při načítání.' }, { status: 500 });
  }
}
