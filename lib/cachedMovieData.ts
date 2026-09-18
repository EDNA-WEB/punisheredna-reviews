import { unstable_cache } from 'next/cache';
import { prisma } from './prisma';
import { publishedNewsFilter } from './publishedFilter';
import { getVerifiedCriticIds } from './criticStatus';

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

// Hlavná stránka — najnavštevovanejšia stránka webu. Zoskupuje VŠETKY dáta,
// čo sú rovnaké pre každého návštevníka (rebríčky, novinky, trailery,
// najnovšie recenzie, narodeniny/úmrtia osobností, top herci/tvorcovia,
// recenzie overených kritikov). Osobné časti (odporúčania, koho sledujem,
// recenzie od sledovaných ľudí) zostávajú mimo tejto funkcie — tie sa
// dopĺňajú samostatne, vždy čerstvo, priamo na stránke.
export const getCachedHomepageData = unstable_cache(
  async () => {
    const [trailerVideos, news, latestReviews, popularMovies, recentMovies, popularSeries, topActors, topCreators, birthdaysToday, recentlyDeceased] =
      await Promise.all([
        prisma.movieVideo.findMany({
          where: { category: 'trailer', featuredOnHome: true, episodeId: null, seasonId: null, movie: { approved: true } },
          orderBy: { createdAt: 'desc' },
          take: 20,
          include: {
            movie: { select: { title: true, poster: true } },
            subtitles: { orderBy: { startTime: 'asc' }, select: { startTime: true, endTime: true, text: true } },
            _count: { select: { subtitles: true } }
          }
        }),
        prisma.newsPost.findMany({ where: publishedNewsFilter(), orderBy: { createdAt: 'desc' }, take: 5 }),
        prisma.review.findMany({
          where: { movie: { approved: true }, seasonId: null, episodeId: null },
          orderBy: { createdAt: 'desc' },
          take: 8,
          include: {
            movie: { include: { ratings: { where: { seasonId: null, episodeId: null } } } },
            author: { select: { id: true, name: true, avatar: true, membershipUntil: true } }
          }
        }),
        prisma.movie.findMany({
          where: { approved: true },
          orderBy: { ratings: { _count: 'desc' } },
          take: 7,
          select: { id: true, title: true, slug: true, year: true, poster: true, genres: true, countries: true }
        }),
        prisma.movie.findMany({
          where: { approved: true },
          orderBy: { createdAt: 'desc' },
          take: 7,
          select: { id: true, title: true, slug: true, year: true, poster: true, genres: true, countries: true }
        }),
        prisma.movie.findMany({
          where: { approved: true, contentType: 'Seriál' },
          orderBy: { ratings: { _count: 'desc' } },
          take: 5,
          select: { id: true, title: true, slug: true, year: true, poster: true, genres: true, countries: true }
        }),
        prisma.person.findMany({
          where: { role: 'ACTOR', approved: true, photo: { not: null } },
          orderBy: { followers: { _count: 'desc' } },
          take: 8,
          select: { id: true, name: true, slug: true, photo: true }
        }),
        prisma.person.findMany({
          where: { role: 'CREATOR', approved: true, photo: { not: null } },
          orderBy: { followers: { _count: 'desc' } },
          take: 8,
          select: { id: true, name: true, slug: true, photo: true }
        }),
        // "Dnes slávia narodeniny" — zhoda mesiaca a dňa narodenia s dneškom,
        // bez ohľadu na rok. Prisma toto priamo nevie, preto SQL dopyt priamo.
        prisma.$queryRaw<{ id: string; name: string; slug: string; photo: string | null; birthDate: Date | null; deathDate: Date | null }[]>`
          SELECT id, name, slug, photo, "birthDate", "deathDate" FROM "Person"
          WHERE approved = true
            AND "deathDate" IS NULL
            AND "birthDate" IS NOT NULL
            AND photo IS NOT NULL
            AND EXTRACT(MONTH FROM "birthDate") = EXTRACT(MONTH FROM CURRENT_DATE)
            AND EXTRACT(DAY FROM "birthDate") = EXTRACT(DAY FROM CURRENT_DATE)
          ORDER BY name ASC
          LIMIT 12
        `,
        prisma.person.findMany({
          where: { approved: true, deathDate: { not: null }, photo: { not: null } },
          orderBy: { deathDate: 'desc' },
          take: 12,
          select: { id: true, name: true, slug: true, photo: true, birthDate: true, deathDate: true }
        })
      ]);

    const verifiedCriticIds = Array.from(await getVerifiedCriticIds());
    const criticReviews = verifiedCriticIds.length
      ? await prisma.review.findMany({
          where: { authorId: { in: verifiedCriticIds }, movie: { approved: true }, seasonId: null, episodeId: null },
          orderBy: { createdAt: 'desc' },
          take: 8,
          include: {
            movie: { include: { ratings: { where: { seasonId: null, episodeId: null } } } },
            author: { select: { id: true, name: true, avatar: true, membershipUntil: true } }
          }
        })
      : [];

    return {
      trailerVideos, news, latestReviews, popularMovies, recentMovies, popularSeries,
      topActors, topCreators, birthdaysToday, recentlyDeceased, criticReviews
    };
  },
  ['homepage-data'],
  { revalidate: 600 }
);

// Kino a VOD prehľad — obe stránky sú úplne bez osobných dát (žiadna session),
// parametrizované len mesiacom a rokom. Kľúč cache automaticky zahŕňa tieto
// argumenty, takže každý mesiac/rok má svoj vlastný záznam.
export const getCachedKinoPremieres = unstable_cache(
  async (rangeStartISO: string, rangeEndISO: string) => {
    const movieRows = await prisma.moviePremiereDate.findMany({
      where: {
        type: { not: 'VOD' },
        releaseDate: { gte: new Date(rangeStartISO), lt: new Date(rangeEndISO) },
        movie: { approved: true, contentType: 'Film' }
      },
      orderBy: { releaseDate: 'asc' },
      include: { movie: true }
    });

    const seenMovieIds = new Set<string>();
    const movies: (typeof movieRows)[number]['movie'][] & { releaseDate: Date }[] = [] as any;
    for (const row of movieRows) {
      if (seenMovieIds.has(row.movieId)) continue;
      seenMovieIds.add(row.movieId);
      (movies as any).push({ ...row.movie, releaseDate: row.releaseDate });
    }

    const allNames = Array.from(
      new Set(
        (movies as any[]).flatMap((m) => [
          ...(m.director ? m.director.split(',').map((x: string) => x.trim()) : []),
          ...(m.cast ? m.cast.split(',').map((x: string) => x.trim()).slice(0, 3) : [])
        ])
      )
    );
    const people = allNames.length ? await prisma.person.findMany({ where: { name: { in: allNames } }, select: { name: true, slug: true } }) : [];

    return { movies, people };
  },
  ['kino-premieres'],
  { revalidate: 600 }
);

export const getCachedVodPremieres = unstable_cache(
  async (rangeStartISO: string, rangeEndISO: string) => {
    const movieRows = await prisma.moviePremiereDate.findMany({
      where: {
        type: 'VOD',
        releaseDate: { gte: new Date(rangeStartISO), lt: new Date(rangeEndISO) },
        movie: { approved: true }
      },
      orderBy: { releaseDate: 'asc' },
      include: { movie: true }
    });

    const seenMovieIds = new Set<string>();
    const movies: any[] = [];
    for (const row of movieRows) {
      if (seenMovieIds.has(row.movieId)) continue;
      seenMovieIds.add(row.movieId);
      movies.push({ ...row.movie, releaseDate: row.releaseDate });
    }

    const allNames = Array.from(
      new Set(
        movies.flatMap((m) => [
          ...(m.director ? m.director.split(',').map((x: string) => x.trim()) : []),
          ...(m.cast ? m.cast.split(',').map((x: string) => x.trim()).slice(0, 3) : [])
        ])
      )
    );
    const people = allNames.length ? await prisma.person.findMany({ where: { name: { in: allNames } }, select: { name: true, slug: true } }) : [];

    return { movies, people };
  },
  ['vod-premieres'],
  { revalidate: 600 }
);

// Verejné štatistiky do bočného panelu (koľko filmov v češtine, koľko je
// dostupných online) — počíta sa z CELEJ filmotéky, preto cachujeme na
// dlhšie (30 minút), nech to nezaťažuje databázu pri každom zobrazení
// akejkoľvek stránky.
export const getCachedSiteStats = unstable_cache(
  async () => {
    const movies = await prisma.movie.findMany({
      where: { approved: true },
      select: { synopsis: true, watchUrl: true, seasons: { select: { episodes: { select: { onlineUrl: true } } } } }
    });

    const czechRegex = /[řěů]/i;
    const totalMovies = movies.length;
    const czechCount = movies.filter((m) => m.synopsis && czechRegex.test(m.synopsis)).length;
    const onlineCount = movies.filter(
      (m) => m.watchUrl || m.seasons.some((s) => s.episodes.some((e) => e.onlineUrl))
    ).length;

    return { totalMovies, czechCount, onlineCount };
  },
  ['site-stats-panel'],
  { revalidate: 1800 }
);

// Ľahký zoznam VŠETKÝCH schválených filmov (len id + oba názvy) na účely
// vyhľadávania — vďaka tomu, že je to malé množstvo dát na položku, sa oplatí
// držať ho celý v pamäti a robiť "fuzzy" porovnávanie (tolerantné na preklepy)
// priamo v JavaScripte, keďže SQL "obsahuje" si s preklepom nevie poradiť.
export const getCachedSearchIndex = unstable_cache(
  async () => {
    return prisma.movie.findMany({
      where: { approved: true },
      select: { id: true, title: true, originalTitle: true }
    });
  },
  ['search-index'],
  { revalidate: 600 }
);
