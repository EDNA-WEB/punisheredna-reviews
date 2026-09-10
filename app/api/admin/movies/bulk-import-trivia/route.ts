import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logBulkImportBatch, LoggedChange } from '@/lib/bulkImportLog';
import { buildTitleIndex, findCandidates, splitLineParts, splitLines, tryParseJsonInput, pickField } from '@/lib/titleMatch';

const MAX_TRIVIA_PER_MOVIE = 50;
const MAX_TRIVIA_LENGTH = 2000;

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Nemáš oprávnenie na túto akciu.' }, { status: 403 });
  }

  const { text, preview } = await req.json();
  if (typeof text !== 'string' || !text.trim()) {
    return NextResponse.json({ error: 'Chýba text na spracovanie.' }, { status: 400 });
  }

  // Očakávaný formát riadku: "Názov filmu – Zaujímavosť 1; Zaujímavosť 2"
  // Bodkočiarka namiesto čiarky, keďže samotná zaujímavosť môže obsahovať čiarky.
  const jsonResult = tryParseJsonInput(text);
  let lines: string[];
  if (jsonResult) {
    if ('error' in jsonResult) return NextResponse.json({ error: jsonResult.error }, { status: 400 });
    lines = jsonResult.items
      .map((item) => {
        const title = pickField(item, ['title', 'name']);
        const year = pickField(item, ['year']);
        const rawTrivia = pickField(item, ['trivia']);
        if (!title || !rawTrivia) return null;
        const triviaStr = Array.isArray(rawTrivia) ? rawTrivia.filter((t) => typeof t === 'string').join('; ') : String(rawTrivia);
        if (!triviaStr) return null;
        return `${title}${year ? ` (${year})` : ''} – ${triviaStr}`;
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
      results.push({ line, status: 'CHYBA', detail: 'Riadok nezodpovedá formátu "Názov – zaujímavosti" (skontroluj medzery okolo pomlčky)' });
      continue;
    }
    const [rawTitleFull, rawTrivia] = parts;
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
    const newFacts = rawTrivia
      .split(';')
      .map((t) => t.trim())
      .filter(Boolean)
      .filter((t) => t.length <= MAX_TRIVIA_LENGTH);

    if (newFacts.length === 0) {
      results.push({ line, status: 'CHYBA', detail: 'Žiadna platná zaujímavosť na pridanie (príliš dlhá alebo prázdna)' });
      continue;
    }

    const existing = await prisma.movieTrivia.findMany({ where: { movieId: movie.id }, orderBy: { order: 'asc' } });
    const existingTexts = new Set(existing.map((t) => t.text));
    const toAdd = newFacts.filter((t) => !existingTexts.has(t));

    if (toAdd.length === 0) {
      results.push({ line, status: 'BEZ ZMENY', detail: `${movie.title}: všetky zaujímavosti už existujú` });
      continue;
    }

    const availableSlots = MAX_TRIVIA_PER_MOVIE - existing.length;
    if (availableSlots <= 0) {
      results.push({ line, status: 'CHYBA', detail: `${movie.title}: dosiahnutý limit ${MAX_TRIVIA_PER_MOVIE} zaujímavostí na film` });
      continue;
    }

    const finalToAdd = toAdd.slice(0, availableSlots);

    if (!preview) {
      let order = existing.length;
      for (const factText of finalToAdd) {
        const created = await prisma.movieTrivia.create({ data: { movieId: movie.id, text: factText, order: order++ } });
        changes.push({
          targetType: 'trivia',
          targetId: created.id,
          movieTitle: movie.title,
          field: 'trivia',
          oldValue: null,
          newValue: factText,
          wasCreated: true
        });
      }
    }

    const skippedNote = finalToAdd.length < toAdd.length ? ` (${toAdd.length - finalToAdd.length} presiahlo limit)` : '';
    results.push({ line, status: 'OK', detail: `${movie.title}: pridaných ${finalToAdd.length} zaujímavostí${skippedNote}` });
  }

  if (preview) {
    return NextResponse.json({ results, preview: true });
  }

  const batchId = await logBulkImportBatch('trivia', changes);
  return NextResponse.json({ results, batchId, changedCount: changes.length });
}
