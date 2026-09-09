import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logBulkImportBatch, LoggedChange } from '@/lib/bulkImportLog';
import { buildTitleIndex, findCandidates, splitLineParts, splitLines, tryParseJsonInput, pickField } from '@/lib/titleMatch';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Nemáš oprávnenie na túto akciu.' }, { status: 403 });
  }

  const { text, preview } = await req.json();
  if (typeof text !== 'string' || !text.trim()) {
    return NextResponse.json({ error: 'Chýba text na spracovanie.' }, { status: 400 });
  }

  // Očakávaný formát riadku: "Názov filmu – tag1, tag2, tag3"
  const jsonResult = tryParseJsonInput(text);
  let lines: string[];
  if (jsonResult) {
    if ('error' in jsonResult) return NextResponse.json({ error: jsonResult.error }, { status: 400 });
    lines = jsonResult.items
      .map((item) => {
        const title = pickField(item, ['title', 'name']);
        const rawTags = pickField(item, ['tags']);
        if (!title || !rawTags) return null;
        const tagsStr = Array.isArray(rawTags) ? rawTags.filter((t) => typeof t === 'string').join(', ') : String(rawTags);
        if (!tagsStr) return null;
        return `${title} – ${tagsStr}`;
      })
      .filter(Boolean) as string[];
  } else {
    lines = splitLines(text);
  }

  const allMovies = await prisma.movie.findMany({
    where: { approved: true },
    select: { id: true, title: true, originalTitle: true, tags: true, year: true }
  });
  const index = buildTitleIndex(allMovies);

  const results: { line: string; status: string; detail?: string; oldValue?: string | null; newValue?: string }[] = [];
  const changes: LoggedChange[] = [];

  for (const line of lines) {
    const parts = splitLineParts(line, 2);
    if (!parts) {
      results.push({ line, status: 'CHYBA', detail: 'Riadok nezodpovedá formátu "Názov – tagy" (skontroluj medzery okolo pomlčky)' });
      continue;
    }
    const [rawTitleFull, rawTags] = parts;
    const { candidates, title, suggestion } = findCandidates(index, rawTitleFull);

    if (candidates.length === 0) {
      results.push({
        line,
        status: 'NENÁJDENÉ',
        detail: suggestion
          ? `Žiadny presný film s názvom "${title}" — vo filmotéke je podobný "${suggestion}", skontroluj presný názov`
          : `Žiadny film s názvom "${title}"`
      });
      continue;
    }
    if (candidates.length > 1) {
      const years = candidates.map((c) => c.year || '?').join(', ');
      results.push({ line, status: 'NEJEDNOZNAČNÉ', detail: `Viac filmov s názvom "${title}" (roky: ${years}) — pridaj rok do zátvorky` });
      continue;
    }

    const movie = candidates[0];
    const newTags = rawTags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    // Existujúce tagy zlúčime s novými, nech sa nič neprepíše ani neduplikuje.
    const existingTags = (movie.tags || '').split(',').map((t) => t.trim()).filter(Boolean);
    const merged = Array.from(new Set([...existingTags, ...newTags]));
    const mergedStr = merged.join(', ');

    results.push({
      line,
      status: mergedStr === (movie.tags || '') ? 'BEZ ZMENY' : 'OK',
      detail: `${movie.title}: ${mergedStr}`,
      oldValue: movie.tags,
      newValue: mergedStr
    });

    if (!preview && mergedStr !== (movie.tags || '')) {
      await prisma.movie.update({ where: { id: movie.id }, data: { tags: mergedStr } });
      changes.push({
        targetType: 'movie',
        targetId: movie.id,
        movieTitle: movie.title,
        field: 'tags',
        oldValue: movie.tags,
        newValue: mergedStr
      });
    }
  }

  if (preview) {
    return NextResponse.json({ results, preview: true });
  }

  const batchId = await logBulkImportBatch('tags', changes);
  return NextResponse.json({ results, batchId, changedCount: changes.length });
}
