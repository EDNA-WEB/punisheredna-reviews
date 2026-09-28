import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getMobileUser } from '@/lib/mobileAuth';
import {
  getCachedMovieBySlug,
  getCachedMovieTrivia,
  getCachedMovieSeasons,
  getCachedMovieVideos
} from '@/lib/cachedMovieData';
import { computeBlendedPercent, scoreColorStyle } from '@/lib/rating';
import { youtubeVideoId } from '@/lib/markdown';
import { isActiveMember } from '@/lib/membership';
import { getCountryFlagUrl } from '@/lib/countryFlags';
import { logActivity } from '@/lib/logActivity';

export const dynamic = 'force-dynamic';

// Rovnaký vyhradený názov ako web (app/movie/[slug]/page.tsx) aj
// /api/mobile/favorite-movies — iný text by vytvoril duplicitný zoznam.
const FAVORITES_LIST_TITLE = 'Obľúbené';

const PREMIERE_COUNTRY: Record<string, { label: string; iso: string | null }> = {
  CZ: { label: 'Česko', iso: 'cz' },
  SK: { label: 'Slovensko', iso: 'sk' },
  US: { label: 'USA', iso: 'us' },
  GB: { label: 'Velká Británie', iso: 'gb' },
  WORLD: { label: 'Svět', iso: null }
};
const CZECHOSLOVAKIA_END = new Date('1993-01-01T00:00:00Z');

// Kompletné dáta profilu filmu/seriálu pre appku — rovnaké zdroje ako webová
// stránka filmu (cachované dopyty z lib/cachedMovieData, percento cez
// computeBlendedPercent, premiéry/tagy/kde sledovať v rovnakom tvare ako
// MoviePremieresBox/TagsBox/WhereToWatchBox). Prijíma ?slug= alebo ?id=.
export async function GET(req: Request) {
  try {
    const me = await getMobileUser(req);
    if (!me) return NextResponse.json({ error: 'Neplatné alebo vypršané prihlásenie.' }, { status: 401 });
    const viewerId = me.id;
    const isAdmin = me.role === 'ADMIN';

    const { searchParams } = new URL(req.url);
    let slug = searchParams.get('slug');
    const id = searchParams.get('id');
    if (!slug && id) {
      const found = await prisma.movie.findUnique({ where: { id }, select: { slug: true } });
      slug = found?.slug || null;
    }
    if (!slug) return NextResponse.json({ error: 'Film se nenašel.' }, { status: 404 });

    const movie = await getCachedMovieBySlug(slug);
    if (!movie) return NextResponse.json({ error: 'Film se nenašel.' }, { status: 404 });
    if (!movie.approved && movie.submittedById !== viewerId && !isAdmin) {
      return NextResponse.json({ error: 'Film se nenašel.' }, { status: 404 });
    }

    // Golden Ticket pravidlo ako na webe — nový titul vidia ostatní až po 2 h.
    if (!isAdmin && !(await isActiveMember(viewerId))) {
      const visibleAt = new Date(new Date(movie.createdAt).getTime() + 2 * 60 * 60 * 1000);
      if (visibleAt > new Date()) {
        const minutesLeft = Math.max(1, Math.ceil((visibleAt.getTime() - Date.now()) / 60000));
        return NextResponse.json({ error: `Tento titul bude dostupný přibližně za ${minutesLeft} min.`, locked: true }, { status: 403 });
      }
    }

    const releaseDate = movie.releaseDate ? new Date(movie.releaseDate) : null;
    const isUpcoming = !!(releaseDate && releaseDate > new Date());
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    const isInCinemas = !!(movie.nowShowing && (!releaseDate || releaseDate >= oneMonthAgo));

    const [trivia, seasons, videos, watchlistItem, favoriteItem, fansCount, photoRows] = await Promise.all([
      getCachedMovieTrivia(movie.id),
      movie.contentType === 'Seriál' ? getCachedMovieSeasons(movie.id) : Promise.resolve([] as any[]),
      getCachedMovieVideos(movie.id),
      prisma.watchlistItem.findUnique({ where: { userId_movieId: { userId: viewerId, movieId: movie.id } } }),
      prisma.movieListItem.findFirst({ where: { movieId: movie.id, list: { authorId: viewerId, title: FAVORITES_LIST_TITLE } } }),
      prisma.movieListItem.count({ where: { movieId: movie.id, list: { title: FAVORITES_LIST_TITLE } } }),
      // Galéria v appke potrebuje aj plnú veľkosť (cache filmu drží len náhľady).
      prisma.moviePhoto.findMany({ where: { movieId: movie.id, episodeId: null }, orderBy: { order: 'asc' }, select: { thumbnail: true, full: true } })
    ]);

    logActivity(viewerId, `Profil filmu ${movie.title}`, `/movie/${movie.slug}`);

    // Rok — pri seriáli rozsah podľa sérií (rovnako ako web).
    const seasonYears = (seasons as any[])
      .map((s) => (s.releaseDate ? new Date(s.releaseDate).getFullYear() : null))
      .filter((y): y is number => !!y);
    const displayYear =
      seasonYears.length > 1 && Math.min(...seasonYears) !== Math.max(...seasonYears)
        ? `${Math.min(...seasonYears)}–${Math.max(...seasonYears)}`
        : seasonYears.length > 1
          ? String(seasonYears[0])
          : movie.year;

    const percent = computeBlendedPercent(movie.ratings, movie.tmdbVoteAverage, movie.tmdbVoteCount);
    const myRating = movie.ratings.find((r) => r.userId === viewerId)?.value ?? null;
    const myReview = movie.reviews.find((r) => r.authorId === viewerId) || null;

    // Ľudia — herci + štáb, s fotkou a slugom z tabuľky Person (ak existuje).
    const split = (v: string | null) => (v || '').split(',').map((x) => x.trim()).filter(Boolean);
    const castNames = split(movie.cast);
    const crew = {
      director: split(movie.director),
      screenplay: split(movie.screenplay),
      cinematography: split(movie.cinematography),
      music: split(movie.music)
    };
    const allNames = Array.from(new Set([...castNames, ...crew.director, ...crew.screenplay, ...crew.cinematography, ...crew.music]));
    const people = allNames.length
      ? await prisma.person.findMany({ where: { name: { in: allNames } }, select: { name: true, slug: true, photo: true } })
      : [];
    const personByName = new Map(people.map((p) => [p.name, p]));
    const toPerson = (name: string) => ({ name, slug: personByName.get(name)?.slug || null, photo: personByName.get(name)?.photo || null });

    // Recenzie — hodnotenie autora + počet lajkov, zoradené podľa lajkov
    // (rovnako ako web vyberá "top" recenzie v prehľade).
    const ratingByUser = new Map(movie.ratings.map((r) => [r.userId, r.value]));
    const reviews = [...movie.reviews]
      .map((r) => ({
        id: r.id,
        body: r.body,
        createdAt: r.createdAt,
        rating: ratingByUser.get(r.authorId) ?? null,
        likesCount: r.likes.filter((l) => l.value === 1).length,
        isMine: r.authorId === viewerId,
        author: { id: r.author.id, name: r.author.name, avatar: r.author.avatar, isCritic: r.author.role === 'ADMIN' }
      }))
      .sort((a, b) => b.likesCount - a.likesCount || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const videoList = videos
      .map((v) => ({ id: v.id, title: v.title, category: v.category, youtubeId: youtubeVideoId(v.url) }))
      .filter((v) => v.youtubeId);
    const primaryVideo = videoList.find((v) => v.category === 'trailer') || videoList[0] || null;
    const trailerFallbackId = !primaryVideo && movie.trailerUrl ? youtubeVideoId(movie.trailerUrl) : null;
    const heroVideoId = primaryVideo?.youtubeId || trailerFallbackId;

    // Premiéry — pred 1.1.1993 patrí CZ/SK premiéra Československu.
    const seenPremiere = new Set<string>();
    const premieres = movie.premiereDates
      .map((p) => {
        const date = new Date(p.releaseDate);
        const isCs = (p.country === 'CZ' || p.country === 'SK') && date < CZECHOSLOVAKIA_END;
        const info = PREMIERE_COUNTRY[p.country] || { label: p.country, iso: p.country.length === 2 ? p.country.toLowerCase() : null };
        return {
          id: p.id,
          type: p.type,
          releaseDate: date.toISOString(),
          distributor: p.distributor,
          countryLabel: isCs ? 'Československo' : info.label,
          flagUrl: isCs ? 'https://flagcdn.com/w40/cz.png' : info.iso ? `https://flagcdn.com/w40/${info.iso}.png` : null
        };
      })
      .filter((p) => {
        const key = `${p.countryLabel}|${p.type}|${p.releaseDate.slice(0, 10)}`;
        if (seenPremiere.has(key)) return false;
        seenPremiere.add(key);
        return true;
      });

    const firstCountry = split(movie.countries)[0] || null;

    return NextResponse.json(
      {
        id: movie.id,
        slug: movie.slug,
        title: movie.title,
        originalTitle: movie.originalTitle && movie.originalTitle !== movie.title ? movie.originalTitle : null,
        originalTitleFlag: firstCountry ? getCountryFlagUrl(firstCountry)?.url || null : null,
        contentType: movie.contentType,
        poster: movie.poster,
        isCamVersion: movie.isCamVersion,
        year: displayYear,
        countries: movie.countries,
        runtimeMinutes: movie.runtimeMinutes,
        genres: split(movie.genres),
        synopsis: movie.synopsis,
        heroImage: heroVideoId
          ? `https://img.youtube.com/vi/${heroVideoId}/hqdefault.jpg`
          : movie.photos[0]?.thumbnail || movie.poster || null,
        heroVideoId,
        // Tlačidlo "Přehrát online" — samotný odkaz sa sem NEposiela (dostane
        // ho len člen cez /api/mobile/movie-online), len informácia, že existuje.
        hasOnline: !!movie.watchUrl || (seasons as any[]).some((s) => (s.episodes || []).some((e: any) => e.onlineUrl)),
        hasSubtitles: movie.hasSubtitles,
        hasDubbing: movie.hasDubbing,

        percent,
        percentColor: scoreColorStyle(percent).backgroundColor,
        ratingsCount: movie.ratings.length,
        reviewsCount: movie.reviews.length,
        fansCount,
        myRating,
        myReviewId: myReview?.id || null,
        isUpcoming,
        releaseDate: releaseDate ? releaseDate.toISOString() : null,
        isInWatchlist: !!watchlistItem,
        isInFavorites: !!favoriteItem,

        cast: castNames.map(toPerson),
        crew: {
          director: crew.director.map(toPerson),
          screenplay: crew.screenplay.map(toPerson),
          cinematography: crew.cinematography.map(toPerson),
          music: crew.music.map(toPerson)
        },

        whereToWatch: {
          isInCinemas,
          services: movie.streamingServices.map((s) => ({
            id: s.streamingServiceId,
            name: s.streamingService.name,
            icon: s.streamingService.icon,
            color: s.streamingService.color,
            url: s.url
          }))
        },

        reviews,
        videos: videoList,
        trivia,
        photos: photoRows.map((p) => ({ thumbnail: p.thumbnail, full: p.full || p.thumbnail })),
        tags: split(movie.tags),
        ageRating: movie.ageRating,
        premieres,
        seasons: (seasons as any[]).map((s) => ({
          number: s.number,
          episodeCount: s.episodes?.length || s.episodeCount || 0,
          releaseDate: s.releaseDate || null
        }))
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[api/mobile/movie-detail]', error);
    return NextResponse.json({ error: 'Chyba při načítání.' }, { status: 500 });
  }
}
