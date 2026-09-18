import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { computePercent } from '@/lib/rating';
import { checkIpRateLimit } from '@/lib/ipRateLimit';

// Odstráni diakritiku a prevedie na malé písmená — nech "replacement" nájde
// aj film napísaný s diakritikou, a naopak (napr. hľadanie bez mäkčeňov).
function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

// Vypočíta, ako veľmi presne "candidate" (názov filmu) zodpovedá hľadanému
// výrazu — vyššie číslo = lepšia zhoda. Používa sa na zoradenie výsledkov
// podľa relevancie namiesto len podľa dátumu pridania.
function matchScore(candidate: string, normalizedQuery: string, queryWords: string[]): number {
  const normalizedCandidate = normalize(candidate);
  if (!normalizedCandidate) return 0;
  if (normalizedCandidate === normalizedQuery) return 100;
  if (normalizedCandidate.startsWith(normalizedQuery)) return 85;
  if (normalizedCandidate.includes(normalizedQuery)) return 70;
  // Viacslovné hľadanie — napr. "posledny z nas" nájde aj "The Last of Us",
  // ak sú všetky hľadané slová niekde v názve (v akomkoľvek poradí).
  const allWordsPresent = queryWords.every((w) => normalizedCandidate.includes(w));
  if (allWordsPresent) return 55;
  const someWordsPresent = queryWords.some((w) => w.length >= 3 && normalizedCandidate.includes(w));
  if (someWordsPresent) return 30;
  return 0;
}

export async function GET(req: Request) {
  if (!checkIpRateLimit(req, 'search-movies', 10_000, 20)) {
    return NextResponse.json({ error: 'Príliš veľa vyhľadávaní za krátky čas.' }, { status: 429 });
  }

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get('q') || '').trim();

  if (!q || q.length < 2) {
    return NextResponse.json({ movies: [], users: [], episodes: [] });
  }

  const normalizedQuery = normalize(q);
  const queryWords = normalizedQuery.split(/\s+/).filter(Boolean);

  // V databáze filtrujeme voľnejšie (podľa jednotlivých slov, nie celej
  // frázy naraz) — presné zoradenie podľa relevancie sa dorieši až v pamäti,
  // keďže PostgreSQL "contains" sám o sebe nevie skórovať kvalitu zhody ani
  // ignorovať diakritiku.
  const [movies, users, episodes] = await Promise.all([
    prisma.movie.findMany({
      where: {
        approved: true,
        AND: queryWords.map((word) => ({
          OR: [{ title: { contains: word, mode: 'insensitive' as const } }, { originalTitle: { contains: word, mode: 'insensitive' as const } }]
        }))
      },
      take: 40,
      include: { ratings: { where: { seasonId: null, episodeId: null } } }
    }),
    prisma.user.findMany({
      where: { name: { contains: q, mode: 'insensitive' }, banned: false, deleted: false },
      orderBy: { name: 'asc' },
      take: 5,
      select: { id: true, name: true, avatar: true, role: true, membershipUntil: true }
    }),
    prisma.episode.findMany({
      where: { title: { contains: q, mode: 'insensitive' }, season: { movie: { approved: true } } },
      take: 5,
      select: {
        id: true,
        number: true,
        title: true,
        season: { select: { number: true, movie: { select: { title: true, slug: true, poster: true } } } }
      }
    })
  ]);

  const episodeResults = episodes.map((e) => ({
    id: e.id,
    title: e.title,
    number: e.number,
    seasonNumber: e.season.number,
    movieTitle: e.season.movie.title,
    movieSlug: e.season.movie.slug,
    poster: e.season.movie.poster
  }));

  // Zoradenie podľa relevancie: najlepšia zhoda (v hlavnom alebo originálnom
  // názve) navrch; pri rovnakom skóre rozhoduje počet hodnotení (známejšie
  // filmy najprv), keďže tie s väčšou pravdepodobnosťou hľadá návštevník.
  const movieResults = movies
    .map((m) => {
      const titleScore = matchScore(m.title, normalizedQuery, queryWords);
      const originalScore = m.originalTitle ? matchScore(m.originalTitle, normalizedQuery, queryWords) : 0;
      return {
        id: m.id,
        title: m.title,
        slug: m.slug,
        year: m.year,
        poster: m.poster,
        percent: computePercent(m.ratings),
        ratingCount: m.ratings.length,
        score: Math.max(titleScore, originalScore)
      };
    })
    .filter((m) => m.score > 0)
    .sort((a, b) => b.score - a.score || b.ratingCount - a.ratingCount)
    .slice(0, 8)
    .map(({ score, ...rest }) => rest);

  return NextResponse.json({ movies: movieResults, users, episodes: episodeResults });
}
