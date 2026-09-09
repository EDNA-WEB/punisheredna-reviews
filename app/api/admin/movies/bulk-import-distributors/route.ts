import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logBulkImportBatch, LoggedChange } from '@/lib/bulkImportLog';
import { buildTitleIndex, findCandidates, splitLineParts, splitLines, tryParseJsonInput, pickField } from '@/lib/titleMatch';

// Domáce premiéry (ČR/SR) idú v poradí ako prvé, zvyšné krajiny nasledujú
// podľa dátumu premiéry — spravidla ide o pôvodnú/americkú premiéru.
const DOMESTIC_PRIORITY = ['CZ', 'SK'];

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Nemáš oprávnenie na túto akciu.' }, { status: 403 });
  }

  const { text, preview } = await req.json();
  if (typeof text !== 'string' || !text.trim()) {
    return NextResponse.json({ error: 'Chýba text na spracovanie.' }, { status: 400 });
  }

  // Očakávaný formát riadku: "Názov filmu – Distribútor1, Distribútor2"
  const jsonResult = tryParseJsonInput(text);
  let lines: string[];
  if (jsonResult) {
    if ('error' in jsonResult) return NextResponse.json({ error: jsonResult.error }, { status: 400 });
    lines = jsonResult.items
      .map((item) => {
        const title = pickField(item, ['title', 'name']);
        const year = pickField(item, ['year']);
        const rawDistributors = pickField(item, ['distributors']);
        if (!title || !rawDistributors) return null;
        const distStr = Array.isArray(rawDistributors) ? rawDistributors.filter((d) => typeof d === 'string').join(', ') : String(rawDistributors);
        if (!distStr) return null;
        return `${title}${year ? ` (${year})` : ''} – ${distStr}`;
      })
      .filter(Boolean) as string[];
  } else {
    lines = splitLines(text);
  }

  const allMovies = await prisma.movie.findMany({
    where: { approved: true },
    select: { id: true, title: true, originalTitle: true, year: true }
  });
  const index = buildTitleIndex(allMovies);

  const results: { line: string; status: string; detail?: string }[] = [];
  const changes: LoggedChange[] = [];

  for (const line of lines) {
    const parts = splitLineParts(line, 2);
    if (!parts) {
      results.push({ line, status: 'CHYBA', detail: 'Riadok nezodpovedá formátu "Názov – distribútori" (skontroluj medzery okolo pomlčky)' });
      continue;
    }
    const [rawTitleFull, rawDistributors] = parts;
    const { candidates, title, suggestion } = findCandidates(index, rawTitleFull);

    if (candidates.length === 0) {
      results.push({
        line,
        status: 'NENÁJDENÉ',
        detail: suggestion ? `Žiadny presný film s názvom "${title}" — vo filmotéke je podobný "${suggestion}"` : `Žiadny film s názvom "${title}"`
      });
      continue;
    }
    if (candidates.length > 1) {
      const years = candidates.map((c) => c.year || '?').join(', ');
      results.push({ line, status: 'NEJEDNOZNAČNÉ', detail: `Viac filmov s názvom "${title}" (roky: ${years}) — pridaj rok do zátvorky` });
      continue;
    }

    const movie = candidates[0];
    const distributors = rawDistributors
      .split(',')
      .map((d) => d.trim())
      .filter(Boolean);

    const premieres = await prisma.moviePremiereDate.findMany({
      where: { movieId: movie.id },
      orderBy: { releaseDate: 'asc' }
    });

    if (premieres.length === 0) {
      results.push({ line, status: 'BEZ PREMIÉR', detail: `Film "${movie.title}" nemá zatiaľ pridané žiadne dátumy premiér` });
      continue;
    }

    // Krajiny zoradíme: najprv domáce (ČR, SR), potom zvyšné podľa poradia
    // ich najskoršej premiéry — a ku každej priradíme ďalšieho distribútora.
    const countriesInOrder: string[] = [];
    for (const c of DOMESTIC_PRIORITY) {
      if (premieres.some((p) => p.country === c) && !countriesInOrder.includes(c)) countriesInOrder.push(c);
    }
    for (const p of premieres) {
      if (!countriesInOrder.includes(p.country)) countriesInOrder.push(p.country);
    }

    const assignments: string[] = [];
    for (let i = 0; i < distributors.length && i < countriesInOrder.length; i++) {
      const country = countriesInOrder[i];
      const distributor = distributors[i];
      const rowsForCountry = premieres.filter((p) => p.country === country);
      assignments.push(`${country}: ${distributor}`);

      if (!preview) {
        for (const row of rowsForCountry) {
          if (row.distributor === distributor) continue;
          await prisma.moviePremiereDate.update({ where: { id: row.id }, data: { distributor } });
          changes.push({
            targetType: 'premiere',
            targetId: row.id,
            movieTitle: movie.title,
            field: 'distributor',
            oldValue: row.distributor,
            newValue: distributor
          });
        }
      }
    }

    if (distributors.length > countriesInOrder.length) {
      results.push({
        line,
        status: 'ČIASTOČNE',
        detail: `${movie.title} — priradené: ${assignments.join(', ')}. Zvyšní distribútori nemajú k dispozícii ďalšiu krajinu premiéry.`
      });
    } else {
      results.push({ line, status: 'OK', detail: `${movie.title} — priradené: ${assignments.join(', ')}` });
    }
  }

  if (preview) {
    return NextResponse.json({ results, preview: true });
  }

  const batchId = await logBulkImportBatch('distributors', changes);
  return NextResponse.json({ results, batchId, changedCount: changes.length });
}
