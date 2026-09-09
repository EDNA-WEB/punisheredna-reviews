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

  // Očakávaný formát riadku: "Názov filmu – https://www.csfd.cz/film/..."
  const jsonResult = tryParseJsonInput(text);
  let lines: string[];
  if (jsonResult) {
    if ('error' in jsonResult) return NextResponse.json({ error: jsonResult.error }, { status: 400 });
    lines = jsonResult.items
      .map((item) => {
        const title = pickField(item, ['title', 'name']);
        const year = pickField(item, ['year']);
        const url = pickField(item, ['url', 'link', 'csfd_url']);
        if (!title || !url) return null;
        return `${title}${year ? ` (${year})` : ''} – ${url}`;
      })
      .filter(Boolean) as string[];
  } else {
    lines = splitLines(text);
  }

  const csfdType = await prisma.movieLinkType.findUnique({ where: { name: 'ČSFD' } });

  const allMovies = await prisma.movie.findMany({
    where: { approved: true },
    select: { id: true, title: true, originalTitle: true, year: true, links: { where: csfdType ? { linkTypeId: csfdType.id } : undefined } }
  });
  const index = buildTitleIndex(allMovies);

  const results: { line: string; status: string; detail?: string; oldValue?: string | null; newValue?: string }[] = [];
  const pendingWrites: { movieId: string; existingLinkId: string | null; url: string; movieTitle: string }[] = [];

  for (const line of lines) {
    const parts = splitLineParts(line, 2);
    if (!parts || !/^https?:\/\//.test(parts[parts.length - 1])) {
      results.push({ line, status: 'CHYBA', detail: 'Riadok nezodpovedá formátu "Názov – URL" (skontroluj medzery okolo pomlčky)' });
      continue;
    }
    const [rawTitleFull, url] = parts;
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
    const existingLink = movie.links[0] || null;
    const oldUrl = existingLink?.url || null;

    results.push({
      line,
      status: oldUrl === url ? 'BEZ ZMENY' : 'OK',
      detail: movie.title,
      oldValue: oldUrl,
      newValue: url
    });

    if (oldUrl !== url) {
      pendingWrites.push({ movieId: movie.id, existingLinkId: existingLink?.id || null, url, movieTitle: movie.title });
    }
  }

  if (preview) {
    return NextResponse.json({ results, preview: true });
  }

  const changes: LoggedChange[] = [];
  const finalCsfdType = csfdType || (await prisma.movieLinkType.create({ data: { name: 'ČSFD', color: '#c0392b' } }));

  for (const w of pendingWrites) {
    if (w.existingLinkId) {
      const before = await prisma.movieLink.findUnique({ where: { id: w.existingLinkId } });
      await prisma.movieLink.update({ where: { id: w.existingLinkId }, data: { url: w.url } });
      changes.push({
        targetType: 'movieLink',
        targetId: w.existingLinkId,
        movieTitle: w.movieTitle,
        field: 'url',
        oldValue: before?.url || null,
        newValue: w.url,
        wasCreated: false
      });
    } else {
      const created = await prisma.movieLink.create({
        data: { movieId: w.movieId, linkTypeId: finalCsfdType.id, url: w.url }
      });
      changes.push({
        targetType: 'movieLink',
        targetId: created.id,
        movieTitle: w.movieTitle,
        field: 'url',
        oldValue: null,
        newValue: w.url,
        wasCreated: true
      });
    }
  }

  const batchId = await logBulkImportBatch('csfd-links', changes);
  return NextResponse.json({ results, batchId, changedCount: changes.length });
}
