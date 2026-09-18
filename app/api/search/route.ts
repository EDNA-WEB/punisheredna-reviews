import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCachedSearchIndex } from '@/lib/cachedMovieData';
import { computeBlendedPercent } from '@/lib/rating';
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

// Klasická Levenshteinova vzdialenosť (počet úprav — vloženie/vymazanie/zmena
// znaku — potrebných na premenu jedného slova na druhé). Používa sa na
// toleranciu preklepov, napr. "goones" → "goonies" (vzdialenosť 2).
function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const prev = new Array(n + 1);
  const curr = new Array(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    for (let j = 0; j <= n; j++) prev[j] = curr[j];
  }
  return prev[n];
}

// Koľko preklepov ešte tolerujeme, závisí od dĺžky slova — pri krátkych
// slovách by tolerancia 2 znakov spôsobila príliš veľa falošných zhôd.
function maxTypoDistance(wordLength: number): number {
  if (wordLength <= 4) return 1;
  if (wordLength <= 8) return 2;
  return 3;
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

  const candidateWords = normalizedCandidate.split(/\s+/).filter(Boolean);

  // Viacslovné hľadanie — napr. "posledny z nas" nájde aj "The Last of Us",
  // ak sú všetky hľadané slová niekde v názve (v akomkoľvek poradí).
  const allWordsPresent = queryWords.every((w) => normalizedCandidate.includes(w));
  if (allWordsPresent) return 55;

  // Tolerancia na preklepy — každé hľadané slovo porovnáme so slovami z
  // názvu a povolíme malý počet rozdielov (podľa dĺžky slova).
  const allWordsCloseEnough = queryWords.every((qw) =>
    candidateWords.some((cw) => levenshtein(qw, cw) <= maxTypoDistance(qw.length))
  );
  if (allWordsCloseEnough) return 45;

  const someWordsClose = queryWords.some((qw) =>
    qw.length >= 3 && candidateWords.some((cw) => levenshtein(qw, cw) <= maxTypoDistance(qw.length))
  );
  if (someWordsClose) return 25;

  const someWordsPresent = queryWords.some((w) => w.length >= 3 && normalizedCandidate.includes(w));
  if (someWordsPresent) return 20;

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

  const [searchIndex, users, episodes] = await Promise.all([
    getCachedSearchIndex(),
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

  // Skórovanie prebieha nad ĽAHKÝM zoznamom (len id + názvy) v pamäti — tu sa
  // rieši aj tolerancia na preklepy. Až pre TOP 8 zhôd sa potom dotiahnu plné
  // detaily (poster, hodnotenia) samostatným, cieleným dopytom.
  const scored = searchIndex
    .map((m) => {
      const titleScore = matchScore(m.title, normalizedQuery, queryWords);
      const originalScore = m.originalTitle ? matchScore(m.originalTitle, normalizedQuery, queryWords) : 0;
      return { id: m.id, score: Math.max(titleScore, originalScore) };
    })
    .filter((m) => m.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);

  if (scored.length === 0) {
    return NextResponse.json({ movies: [], users, episodes: episodeResults });
  }

  const scoreById = new Map(scored.map((s) => [s.id, s.score]));
  const fullMovies = await prisma.movie.findMany({
    where: { id: { in: scored.map((s) => s.id) } },
    include: { ratings: { where: { seasonId: null, episodeId: null } } }
  });

  // "findMany" s "in" nezaručuje poradie výsledkov podľa vstupného poľa —
  // zoradíme preto ešte raz podľa skóre (a pri zhode podľa počtu hodnotení).
  const movieResults = fullMovies
    .map((m) => ({
      id: m.id,
      title: m.title,
      slug: m.slug,
      year: m.year,
      poster: m.poster,
      percent: computeBlendedPercent(m.ratings, m.tmdbVoteAverage, m.tmdbVoteCount),
      ratingCount: m.ratings.length,
      score: scoreById.get(m.id) || 0
    }))
    .sort((a, b) => b.score - a.score || b.ratingCount - a.ratingCount)
    .map(({ score, ...rest }) => rest);

  return NextResponse.json({ movies: movieResults, users, episodes: episodeResults });
}
