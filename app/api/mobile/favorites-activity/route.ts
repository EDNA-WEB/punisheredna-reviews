import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getMobileUser } from '@/lib/mobileAuth';

export const dynamic = 'force-dynamic';

// Zostaví názov na zobrazenie — pri hodnotení/recenzii celého filmu/seriálu
// len jeho názov, pri konkrétnej sezóne "Název - Sezóna N", pri konkrétnej
// epizóde "Název - S{sezóna}E{epizóda}: Název epizody" (alebo bez názvu
// epizódy, ak ju autor nevyplnil).
function buildDisplayTitle(movieTitle: string, season: { number: number } | null, episode: { number: number; title: string | null } | null) {
  if (episode && season) {
    const epLabel = episode.title ? `: ${episode.title}` : '';
    return `${movieTitle} - S${season.number}E${episode.number}${epLabel}`;
  }
  if (season) return `${movieTitle} - Sezóna ${season.number}`;
  return movieTitle;
}

// Vráti recenzie/hodnotenia od používateľov, čo prihlásený používateľ
// sleduje ("obľúbení"). ?type=all|reviews|ratings, ?page=0,1,2... (10 na
// stránku pri "all"/"reviews"/"ratings" v plnom zozname; appka pre náhľad
// na hlavnej obrazovke jednoducho použije page=0 a vezme len prvých 5).
export async function GET(req: Request) {
  try {
    const user = await getMobileUser(req);
    if (!user) return NextResponse.json({ error: 'Neplatné alebo vypršané prihlásenie.' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') || 'all';
    const page = Math.max(0, parseInt(searchParams.get('page') || '0', 10) || 0);
    const PAGE_SIZE = 10;

    const follows = await prisma.follow.findMany({ where: { followerId: user.id }, select: { followingId: true } });
    const followingIds = follows.map((f) => f.followingId);

    if (followingIds.length === 0) {
      return NextResponse.json({ items: [], hasMore: false }, { status: 200 });
    }

    // Pre "all" aj "reviews" natiahneme viac recenzií naraz (nie len jednu
    // stránku), nech sa dajú správne zoradiť dokopy s hodnoteniami podľa
    // dátumu — presné "cursor" stránkovanie naprieč dvomi rôznymi tabuľkami
    // naraz by bolo zbytočne zložité pre tento účel.
    const fetchLimit = type === 'all' ? (page + 1) * PAGE_SIZE + 20 : (page + 1) * PAGE_SIZE;

    const [reviews, ratings] = await Promise.all([
      type !== 'ratings'
        ? prisma.review.findMany({
            where: { authorId: { in: followingIds } },
            orderBy: { createdAt: 'desc' },
            take: fetchLimit,
            select: {
              id: true,
              body: true,
              createdAt: true,
              movieId: true,
              seasonId: true,
              episodeId: true,
              authorId: true,
              movie: { select: { title: true, slug: true, poster: true, year: true } },
              season: { select: { number: true } },
              episode: { select: { number: true, title: true } },
              author: { select: { name: true, avatar: true } }
            }
          })
        : Promise.resolve([]),
      type !== 'reviews'
        ? prisma.rating.findMany({
            where: { userId: { in: followingIds } },
            orderBy: { createdAt: 'desc' },
            take: fetchLimit,
            select: {
              id: true,
              value: true,
              createdAt: true,
              movieId: true,
              seasonId: true,
              episodeId: true,
              userId: true,
              movie: { select: { title: true, slug: true, poster: true, year: true } },
              season: { select: { number: true } },
              episode: { select: { number: true, title: true } },
              user: { select: { name: true, avatar: true } }
            }
          })
        : Promise.resolve([])
    ]);

    // K recenziám dohľadáme hodnotenie tej istej dvojice film+autor (rovnaký
    // princíp ako pri /api/mobile/reviews).
    const reviewRatings = await prisma.rating.findMany({
      where: { OR: reviews.map((r) => ({ movieId: r.movieId, userId: r.authorId, seasonId: r.seasonId, episodeId: r.episodeId })) },
      select: { movieId: true, userId: true, seasonId: true, episodeId: true, value: true }
    });

    const reviewItems = reviews.map((r) => {
      const rating = reviewRatings.find(
        (rt) => rt.movieId === r.movieId && rt.userId === r.authorId && rt.seasonId === r.seasonId && rt.episodeId === r.episodeId
      );
      return {
        kind: 'review',
        id: r.id,
        createdAt: r.createdAt,
        body: r.body,
        rating: rating?.value ?? null,
        movie: { ...r.movie, displayTitle: buildDisplayTitle(r.movie.title, r.season, r.episode) },
        author: r.author
      };
    });

    const ratingItems = ratings.map((r) => ({
      kind: 'rating',
      id: r.id,
      createdAt: r.createdAt,
      rating: r.value,
      movie: { ...r.movie, displayTitle: buildDisplayTitle(r.movie.title, r.season, r.episode) },
      author: r.user
    }));

    let combined;
    if (type === 'reviews') combined = reviewItems;
    else if (type === 'ratings') combined = ratingItems;
    else combined = [...reviewItems, ...ratingItems].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const pageItems = combined.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
    const hasMore = combined.length > (page + 1) * PAGE_SIZE || (type === 'all' && (reviews.length === fetchLimit || ratings.length === fetchLimit));

    return NextResponse.json({ items: pageItems, hasMore }, { status: 200 });
  } catch (error) {
    console.error('[api/mobile/favorites-activity]', error);
    return NextResponse.json({ error: 'Chyba pri načítaní aktivity.' }, { status: 500 });
  }
}
