import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Normalizácia názvu na porovnávanie — malé písmená, bez diakritiky,
// orezané medzery, nech "Kmotr" a "kmotr " nájdu rovnaký film.
function normalize(title: string): string {
  return title
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Nemáš oprávnenie na túto akciu.' }, { status: 403 });
  }

  const { text } = await req.json();
  if (typeof text !== 'string' || !text.trim()) {
    return NextResponse.json({ error: 'Chýba text na spracovanie.' }, { status: 400 });
  }

  // Očakávaný formát riadku: "Názov filmu – https://www.csfd.cz/film/..."
  // (pomlčka môže byť aj obyčajná "-" alebo "–").
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  const csfdType = await prisma.movieLinkType.upsert({
    where: { name: 'ČSFD' },
    update: {},
    create: { name: 'ČSFD', color: '#c0392b' }
  });

  const allMovies = await prisma.movie.findMany({
    where: { approved: true },
    select: { id: true, title: true, originalTitle: true }
  });
  const byNormalizedTitle = new Map<string, { id: string; title: string }[]>();
  for (const m of allMovies) {
    for (const t of [m.title, m.originalTitle].filter(Boolean) as string[]) {
      const key = normalize(t);
      if (!byNormalizedTitle.has(key)) byNormalizedTitle.set(key, []);
      byNormalizedTitle.get(key)!.push({ id: m.id, title: m.title });
    }
  }

  const results: { line: string; status: string; detail?: string }[] = [];

  for (const line of lines) {
    const match = line.match(/^(.+?)\s*[–-]\s*(https?:\/\/\S+)$/);
    if (!match) {
      results.push({ line, status: 'CHYBA', detail: 'Riadok nezodpovedá formátu "Názov – URL"' });
      continue;
    }
    const [, rawTitle, url] = match;
    const candidates = byNormalizedTitle.get(normalize(rawTitle));

    if (!candidates || candidates.length === 0) {
      results.push({ line, status: 'NENÁJDENÉ', detail: `Žiadny film s názvom "${rawTitle}"` });
      continue;
    }
    if (candidates.length > 1) {
      results.push({ line, status: 'NEJEDNOZNAČNÉ', detail: `Viac filmov s názvom "${rawTitle}" — preskočené` });
      continue;
    }

    const movie = candidates[0];
    await prisma.movieLink.upsert({
      where: { movieId_linkTypeId: { movieId: movie.id, linkTypeId: csfdType.id } },
      update: { url },
      create: { movieId: movie.id, linkTypeId: csfdType.id, url }
    });
    results.push({ line, status: 'OK', detail: movie.title });
  }

  return NextResponse.json({ results });
}
