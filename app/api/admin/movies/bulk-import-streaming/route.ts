import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logBulkImportBatch, LoggedChange } from '@/lib/bulkImportLog';
import { buildTitleIndex, findCandidates, splitLineParts, normalizeTitle } from '@/lib/titleMatch';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Nemáš oprávnenie na túto akciu.' }, { status: 403 });
  }

  const { text, preview } = await req.json();
  if (typeof text !== 'string' || !text.trim()) {
    return NextResponse.json({ error: 'Chýba text na spracovanie.' }, { status: 400 });
  }

  // Očakávaný formát riadku: "Názov filmu – Platforma – https://..."
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  const allMovies = await prisma.movie.findMany({
    where: { approved: true },
    select: { id: true, title: true, originalTitle: true, year: true, streamingServices: { include: { streamingService: true } } }
  });
  const index = buildTitleIndex(allMovies);

  const allServices = await prisma.streamingService.findMany();
  const serviceByName = new Map(allServices.map((s) => [normalizeTitle(s.name), s]));

  const results: { line: string; status: string; detail?: string; oldValue?: string | null; newValue?: string }[] = [];
  const changes: LoggedChange[] = [];

  for (const line of lines) {
    const parts = splitLineParts(line, 3);
    if (!parts || !/^https?:\/\//.test(parts[parts.length - 1])) {
      results.push({ line, status: 'CHYBA', detail: 'Riadok nezodpovedá formátu "Názov – Platforma – URL" (skontroluj medzery okolo pomlčiek)' });
      continue;
    }
    // Ak je v názve filmu pomlčka s medzerami (nezvyčajné, ale pre istotu),
    // posledné dve časti sú vždy Platforma a URL, zvyšok je názov filmu.
    const url = parts[parts.length - 1];
    const rawService = parts[parts.length - 2];
    const rawTitleFull = parts.slice(0, parts.length - 2).join(' – ');

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

    let service = serviceByName.get(normalizeTitle(rawService));
    const serviceIsNew = !service;

    const existingLink = movie.streamingServices.find((s) => service && s.streamingServiceId === service.id);
    const oldUrl = existingLink?.url || null;

    results.push({
      line,
      status: oldUrl === url ? 'BEZ ZMENY' : 'OK',
      detail: `${movie.title} — ${rawService.trim()}${serviceIsNew ? ' (nová platforma)' : ''}`,
      oldValue: oldUrl,
      newValue: url
    });

    if (!preview && oldUrl !== url) {
      if (!service) {
        service = await prisma.streamingService.create({ data: { name: rawService.trim() } });
        serviceByName.set(normalizeTitle(service.name), service);
      }

      if (existingLink) {
        await prisma.movieStreamingService.update({
          where: { movieId_streamingServiceId: { movieId: movie.id, streamingServiceId: service.id } },
          data: { url }
        });
        changes.push({
          targetType: 'streamingService',
          targetId: existingLink.id,
          movieTitle: movie.title,
          field: 'url',
          oldValue: oldUrl,
          newValue: url,
          wasCreated: false
        });
      } else {
        const created = await prisma.movieStreamingService.create({
          data: { movieId: movie.id, streamingServiceId: service.id, url }
        });
        changes.push({
          targetType: 'streamingService',
          targetId: created.id,
          movieTitle: movie.title,
          field: 'url',
          oldValue: null,
          newValue: url,
          wasCreated: true
        });
      }
    }
  }

  if (preview) {
    return NextResponse.json({ results, preview: true });
  }

  const batchId = await logBulkImportBatch('kde-sledovat', changes);
  return NextResponse.json({ results, batchId, changedCount: changes.length });
}
