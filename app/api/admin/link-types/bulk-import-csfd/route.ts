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
    select: { id: true, title: true, originalTitle: true, year: true }
  });
  const byNormalizedTitle = new Map<string, { id: string; title: string; year: string | null }[]>();
  for (const m of allMovies) {
    for (const t of [m.title, m.originalTitle].filter(Boolean) as string[]) {
      const key = normalize(t);
      if (!byNormalizedTitle.has(key)) byNormalizedTitle.set(key, []);
      byNormalizedTitle.get(key)!.push({ id: m.id, title: m.title, year: m.year });
    }
  }

  const results: { line: string; status: string; detail?: string }[] = [];

  for (const line of lines) {
    const match = line.match(/^(.+?)\s*[–-]\s*(https?:\/\/\S+)$/);
    if (!match) {
      results.push({ line, status: 'CHYBA', detail: 'Riadok nezodpovedá formátu "Názov – URL"' });
      continue;
    }
    const [, rawTitleFull, url] = match;

    // Voliteľný rok v zátvorke na konci názvu, napr. "Street Fighter (2026)" —
    // rieši prípady, keď máme vo filmotéke viac filmov s rovnakým názvom.
    const yearMatch = rawTitleFull.match(/^(.+?)\s*\((\d{4})\)\s*$/);
    const rawTitle = yearMatch ? yearMatch[1].trim() : rawTitleFull.trim();
    const explicitYear = yearMatch ? yearMatch[2] : null;

    let candidates = byNormalizedTitle.get(normalize(rawTitle)) || [];
    if (explicitYear) candidates = candidates.filter((c) => (c.year || '').startsWith(explicitYear));

    if (candidates.length === 0) {
      const allTitles = Array.from(byNormalizedTitle.keys());
      const suggestion = allTitles.find((t) => t.includes(normalize(rawTitle)) || normalize(rawTitle).includes(t));
      results.push({
        line,
        status: 'NENÁJDENÉ',
        detail: suggestion
          ? `Žiadny presný film s názvom "${rawTitle}" — možno myslíš niečo podobné, over si presný názov vo filmotéke`
          : `Žiadny film s názvom "${rawTitle}"`
      });
      continue;
    }
    if (candidates.length > 1) {
      const years = candidates.map((c) => c.year || '?').join(', ');
      results.push({
        line,
        status: 'NEJEDNOZNAČNÉ',
        detail: `Viac filmov s názvom "${rawTitle}" (roky: ${years}) — pridaj rok do zátvorky, napr. "${rawTitle} (${candidates[0].year})"`
      });
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
