import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logBulkImportBatch, LoggedChange } from '@/lib/bulkImportLog';
import { logBulkAction } from '@/lib/auditLog';
import { buildTitleIndex, findCandidates, splitLineParts, splitLines, tryParseJsonInput, pickField } from '@/lib/titleMatch';

const MAX_TRIVIA_PER_MOVIE = 50;
const MAX_TRIVIA_LENGTH = 2000;

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Nemáš oprávnění k této akci.' }, { status: 403 });
  }

  const { text, preview, batchId: clientBatchId } = await req.json();
  if (typeof text !== 'string' || !text.trim()) {
    return NextResponse.json({ error: 'Chybí text ke zpracování.' }, { status: 400 });
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
      results.push({ line, status: 'CHYBA', detail: 'Řádek neodpovídá formátu "Název – zajímavosti" (zkontroluj mezery kolem pomlčky)' });
      continue;
    }
    const [rawTitleFull, rawTrivia] = parts;
    const { candidates, title, suggestion } = findCandidates(index, rawTitleFull);

    if (candidates.length === 0) {
      results.push({
        line,
        status: 'NENÁJDENÉ',
        detail: suggestion ? `Žádný přesný film s názvem "${title}" — vo filmotéke je podobný "${suggestion}"` : `Žádný film s názvem "${title}"`
      });
      continue;
    }
    if (candidates.length > 1) {
      const years = candidates.map((c) => c.year || '?').join(', ');
      results.push({ line, status: 'NEJEDNOZNAČNÉ', detail: `Více filmů s názvem "${title}" (roky: ${years}) — přidej rok do závorky` });
      continue;
    }

    const movie = candidates[0];
    const newFacts = rawTrivia
      .split(';')
      .map((t) => t.trim())
      .filter(Boolean)
      .filter((t) => t.length <= MAX_TRIVIA_LENGTH);

    if (newFacts.length === 0) {
      results.push({ line, status: 'CHYBA', detail: 'Žádná platná zajímavost k přidání (příliš dlouhá nebo prázdná)' });
      continue;
    }

    const finalToAdd = newFacts.slice(0, MAX_TRIVIA_PER_MOVIE);
    const existing = await prisma.movieTrivia.findMany({ where: { movieId: movie.id } });

    if (!preview) {
      // Nahradenie, nie zlúčenie: pôvodné zaujímavosti filmu sa najprv
      // zalogujú (aby ich šlo pri "vrátiť späť" obnoviť) a zmažú, potom sa
      // vytvoria nové presne podľa toho, čo je v tomto hromadnom importe.
      for (const old of existing) {
        changes.push({
          targetType: 'trivia',
          targetId: old.id,
          movieTitle: movie.title,
          field: '__deleted__',
          oldValue: JSON.stringify({ movieId: old.movieId, text: old.text, order: old.order }),
          newValue: null,
          wasCreated: false
        });
      }
      await prisma.movieTrivia.deleteMany({ where: { movieId: movie.id } });

      let order = 0;
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

    const skippedNote = newFacts.length > MAX_TRIVIA_PER_MOVIE ? ` (${newFacts.length - MAX_TRIVIA_PER_MOVIE} presiahlo limit ${MAX_TRIVIA_PER_MOVIE})` : '';
    results.push({
      line,
      status: 'OK',
      detail: `${movie.title}: nahrazeno — původních ${existing.length}, nových ${finalToAdd.length}${skippedNote}`
    });
  }

  if (preview) {
    return NextResponse.json({ results, preview: true });
  }

  const batchId = await logBulkImportBatch('trivia', changes, clientBatchId);
  await logBulkAction({
    userId: (session.user as any).id,
    userName: (session.user as any).name || 'neznámy',
    toolName: 'Hromadný import zajímavostí',
    updated: changes.length,
    total: results.length,
    extraDetails: 'existující zajímavosti u dotčených filmů byly nahrazeny novými'
  });
  return NextResponse.json({ results, batchId, changedCount: changes.length });
}
