import { unstable_cache } from 'next/cache';
import { prisma } from './prisma';
import { publishedNewsFilter } from './publishedFilter';

// Tieto dáta sú rovnaké pre KAŽDÉHO návštevníka daného filmu — nefiltrujú sa
// podľa konkrétneho prihláseného používateľa (aj "moje hodnotenie" sa vyberá
// až DODATOČNE z tu stiahnutých dát, nie priamym dopytom). Preto sa dajú
// bezpečne cachovať spoločne pre všetkých, bez rizika premiešania osobných
// údajov medzi návštevníkmi.
//
// Krátka doba platnosti (60 sekúnd) zabezpečí, že nová recenzia/komentár sa
// prejaví takmer okamžite, no pri návštevníkoch, čo si film pozerajú v
// krátkom slede za sebou, sa ušetrí opakovaný drahý dopyt do databázy.
export const getCachedMovieBySlug = unstable_cache(
  async (slug: string) => {
    return prisma.movie.findUnique({
      where: { slug },
      include: {
        ratings: { where: { seasonId: null, episodeId: null } },
        streamingServices: {
          include: { streamingService: true },
          orderBy: { streamingService: { order: 'asc' } }
        },
        links: {
          include: { linkType: true },
          orderBy: { linkType: { order: 'asc' } }
        },
        premiereDates: {
          orderBy: { releaseDate: 'asc' }
        },
        photos: {
          where: { episodeId: null },
          orderBy: { order: 'asc' },
          select: { id: true, thumbnail: true }
        },
        reviews: {
          where: { seasonId: null, episodeId: null },
          include: {
            author: { select: { id: true, name: true, avatar: true, role: true, membershipUntil: true } },
            likes: true,
            comments: {
              where: { parentId: null },
              orderBy: { createdAt: 'asc' },
              include: {
                user: { select: { name: true, role: true, avatar: true } },
                likes: true,
                replies: {
                  orderBy: { createdAt: 'asc' },
                  include: { user: { select: { name: true, role: true, avatar: true } }, likes: true }
                }
              }
            }
          }
        }
      }
    });
  },
  ['movie-by-slug'],
  { revalidate: 60 }
);

export const getCachedMovieTrivia = unstable_cache(
  async (movieId: string) => prisma.movieTrivia.findMany({ where: { movieId }, orderBy: { order: 'asc' }, select: { id: true, text: true } }),
  ['movie-trivia'],
  { revalidate: 60 }
);

export const getCachedMovieSeasons = unstable_cache(
  async (movieId: string) =>
    prisma.season.findMany({
      where: { movieId },
      orderBy: { number: 'asc' },
      include: {
        ratings: { where: { episodeId: null } },
        episodes: { orderBy: { number: 'asc' }, include: { ratings: true } }
      }
    }),
  ['movie-seasons'],
  { revalidate: 60 }
);

export const getCachedMovieVideos = unstable_cache(
  async (movieId: string) =>
    prisma.movieVideo.findMany({
      where: { movieId, episodeId: null, seasonId: null },
      orderBy: { order: 'asc' },
      select: {
        id: true,
        url: true,
        category: true,
        title: true,
        subtitles: { orderBy: { startTime: 'asc' }, select: { startTime: true, endTime: true, text: true } }
      }
    }),
  ['movie-videos'],
  { revalidate: 60 }
);

export const getCachedRelatedNews = unstable_cache(
  async (searchTerms: string[]) => {
    if (searchTerms.length === 0) return [];
    return prisma.newsPost.findMany({
      where: { AND: [{ OR: searchTerms.map((term) => ({ title: { contains: term, mode: 'insensitive' as const } })) }, publishedNewsFilter()] },
      orderBy: { createdAt: 'desc' },
      take: 4,
      select: { id: true, title: true, slug: true, summary: true, coverImage: true, createdAt: true }
    });
  },
  ['movie-related-news'],
  { revalidate: 60 }
);

export const getCachedRatersAndWatchlist = unstable_cache(
  async (movieId: string) => {
    const [ratersUsers, wantToWatchUsers] = await Promise.all([
      prisma.rating.findMany({
        where: { movieId, seasonId: null, episodeId: null },
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: { value: true, user: { select: { id: true, name: true, banned: true } } }
      }),
      prisma.watchlistItem.findMany({
        where: { movieId },
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: { user: { select: { id: true, name: true, banned: true } } }
      })
    ]);
    return { ratersUsers, wantToWatchUsers };
  },
  ['movie-raters-watchlist'],
  { revalidate: 60 }
);

// Katalóg filmov/seriálov (stránky "Filmy", "Seriály", "Recenzie" a ich
// pokročilé filtre) — samotný dopyt do databázy v skutočnosti používa len
// malú podmnožinu filtrov (herec, réžia, scenár, kamera, hudba, tag, krajina,
// typ obsahu, "práve v kinách", dĺžka) — zvyšok (žáner, rok, hodnotenie,
// viacero krajín, "má recenzie/galériu/videá/trivia") sa filtruje AŽ
// dodatočne, po natiahnutí, v pamäti. Cachujeme preto len tento surový
// databázový výsledok podľa DB-relevantných filtrov — doplnkové filtrovanie
// aj stránkovanie zostáva vždy čerstvé nad týmito dátami.
export const getCachedMovieCatalog = unstable_cache(
  async (dbFilters: {
    actorFilter: string | null;
    directorFilter: string | null;
    screenplayFilter: string | null;
    cinematographyFilter: string | null;
    musicFilter: string | null;
    tagFilter: string | null;
    countryFilter: string | null;
    typesFilter: string[];
    nowShowingFilter: boolean;
    minLength: number | null;
    maxLength: number | null;
  }) => {
    const {
      actorFilter, directorFilter, screenplayFilter, cinematographyFilter, musicFilter,
      tagFilter, countryFilter, typesFilter, nowShowingFilter, minLength, maxLength
    } = dbFilters;

    return prisma.movie.findMany({
      orderBy: { createdAt: 'desc' },
      where: {
        approved: true,
        ...(actorFilter ? { cast: { contains: actorFilter, mode: 'insensitive' } } : {}),
        ...(directorFilter ? { director: { contains: directorFilter, mode: 'insensitive' } } : {}),
        ...(screenplayFilter ? { screenplay: { contains: screenplayFilter, mode: 'insensitive' } } : {}),
        ...(cinematographyFilter ? { cinematography: { contains: cinematographyFilter, mode: 'insensitive' } } : {}),
        ...(musicFilter ? { music: { contains: musicFilter, mode: 'insensitive' } } : {}),
        ...(tagFilter ? { tags: { contains: tagFilter, mode: 'insensitive' } } : {}),
        ...(countryFilter ? { countries: { contains: countryFilter, mode: 'insensitive' } } : {}),
        ...(typesFilter.length > 0 ? { contentType: { in: typesFilter } } : {}),
        ...(nowShowingFilter ? { nowShowing: true } : {}),
        ...(minLength ? { runtimeMinutes: { gte: minLength } } : {}),
        ...(maxLength ? { runtimeMinutes: { lte: maxLength } } : {})
      },
      include: {
        ratings: { where: { seasonId: null, episodeId: null } },
        premiereDates: { orderBy: { releaseDate: 'asc' }, take: 1, select: { type: true } },
        _count: {
          select: {
            reviews: { where: { seasonId: null, episodeId: null } },
            photos: { where: { episodeId: null } },
            videos: { where: { episodeId: null } },
            trivia: true
          }
        }
      }
    });
  },
  ['movie-catalog'],
  { revalidate: 900 }
);

// Box Office rebríček — rovnaký princíp ako katalóg filmov: dáta sa menia len
// zriedka (admin ručne dopĺňa rozpočty/tržby), takže dlhšia platnosť cache
// (15 minút) je tu úplne v poriadku a výrazne odľahčí databázu.
export const getCachedBoxOfficeMovies = unstable_cache(
  async () => {
    const allMovies = await prisma.movie.findMany({
      where: { approved: true, budget: { not: null } },
      select: {
        id: true, title: true, slug: true, poster: true, year: true, budget: true, marketingBudget: true, boxOffice: true,
        domesticBoxOffice: true, internationalBoxOffice: true, chinaBoxOffice: true, ancillaryRevenue: true,
        premiereDates: { select: { type: true } }
      }
    });
    // Filmy, čo vyšli LEN na VOD (žiadna kinová premiéra), do box office nepatria.
    return allMovies.filter((m) => {
      if (m.premiereDates.length === 0) return true;
      return m.premiereDates.some((p) => p.type !== 'VOD');
    });
  },
  ['box-office-movies'],
  { revalidate: 900 }
);
