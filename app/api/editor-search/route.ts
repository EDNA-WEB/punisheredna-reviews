import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCachedSearchIndex } from '@/lib/cachedMovieData';
import { normalize, matchScore, clampQuery } from '@/lib/fuzzySearch';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { checkIpRateLimit } from '@/lib/ipRateLimit';

// Ľahké vyhľadávanie pre redakčný editor — hľadá naraz filmy/seriály aj osobnosti,
// aby autor vedel do textu vložiť klikateľný odkaz jedným kliknutím (alebo priradiť
// súvisiaci film k novinke). Filmy sa hľadajú rovnako tolerantne ako v hlavnom
// vyhľadávaní na webe — bez ohľadu na diakritiku, aj v anglickom/originálnom názve,
// s toleranciou na preklepy — nie len presnou zhodou v slovenskom/českom názve.
export async function GET(req: Request) {
  // Bezpečnosť: len prihlásený (redakčný editor), s limitom a krátkym dotazom.
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Musíš být přihlášen.' }, { status: 401 });
  if (!checkIpRateLimit(req, 'editor-search', 10_000, 20)) {
    return NextResponse.json({ error: 'Příliš mnoho vyhledávání za krátkou dobu.' }, { status: 429 });
  }
  const { searchParams } = new URL(req.url);
  const q = clampQuery((searchParams.get('q') || '').trim());
  const type = searchParams.get('type');

  if (q.length < 2) return NextResponse.json({ movies: [], people: [] });

  const normalizedQuery = normalize(q);
  const queryWords = normalizedQuery.split(/\s+/).filter(Boolean);

  const [searchIndex, people] = await Promise.all([
    type === 'person' ? Promise.resolve([]) : getCachedSearchIndex(),
    type === 'movie'
      ? Promise.resolve([])
      : prisma.person.findMany({
          where: { approved: true, name: { contains: q, mode: 'insensitive' } },
          orderBy: { name: 'asc' },
          take: 8,
          select: { id: true, name: true, slug: true, photo: true }
        })
  ]);

  // Skórovanie prebieha nad ĽAHKÝM zoznamom (len id + názvy) v pamäti — tu sa
  // rieši aj tolerancia na diakritiku/preklepy. Až pre TOP zhody sa potom
  // dotiahnu plné detaily samostatným, cieleným dopytom.
  const scored = searchIndex
    .map((m: { id: string; title: string; originalTitle: string | null }) => {
      const titleScore = matchScore(m.title, normalizedQuery, queryWords);
      const originalScore = m.originalTitle ? matchScore(m.originalTitle, normalizedQuery, queryWords) : 0;
      return { id: m.id, score: Math.max(titleScore, originalScore) };
    })
    .filter((m) => m.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);

  const movies = scored.length
    ? await prisma.movie.findMany({
        where: { id: { in: scored.map((s) => s.id) } },
        select: { id: true, title: true, slug: true, year: true, poster: true }
      })
    : [];
  // Zoradenie podľa relevancie sa pri dopyte "id in [...]" nezachová — zoradíme
  // preto výsledky znova podľa poradia, čo sme si vypočítali vyššie.
  const orderById = new Map(scored.map((s, i) => [s.id, i]));
  movies.sort((a, b) => (orderById.get(a.id) ?? 0) - (orderById.get(b.id) ?? 0));

  return NextResponse.json({ movies, people }, { headers: { 'Cache-Control': 'no-store' } });
}
