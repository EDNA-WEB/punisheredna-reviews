import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logBulkImportBatch, LoggedChange } from '@/lib/bulkImportLog';
import { logBulkAction } from '@/lib/auditLog';
import { buildTitleIndex, findCandidates, splitLineParts, splitLines, tryParseJsonInput, pickField, extractTrailingUrl } from '@/lib/titleMatch';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Nemáš oprávnění k této akci.' }, { status: 403 });
  }

  const { text, preview, batchId: clientBatchId } = await req.json();
  if (typeof text !== 'string' || !text.trim()) {
    return NextResponse.json({ error: 'Chybí text ke zpracování.' }, { status: 400 });
  }

  // Dva podporované formáty riadku:
  //   "Together – https://..."                  → odkaz na film
  //   "Hra o trůny S01E01 – https://..."         → odkaz na konkrétnu epizódu
  const jsonResult = tryParseJsonInput(text);
  let lines: string[];
  if (jsonResult) {
    if ('error' in jsonResult) return NextResponse.json({ error: jsonResult.error }, { status: 400 });
    lines = jsonResult.items
      .map((item) => {
        const title = pickField(item, ['title', 'name']);
        const year = pickField(item, ['year']);
        const url = pickField(item, ['url', 'link']);
        const season = pickField(item, ['season']);
        const episode = pickField(item, ['episode']);
        if (!title || !url) return null;
        const titlePart = `${title}${year ? ` (${year})` : ''}`;
        if (season !== undefined && episode !== undefined) {
          const s = String(season).padStart(2, '0');
          const e = String(episode).padStart(2, '0');
          return `${titlePart} S${s}E${e} – ${url}`;
        }
        return `${titlePart} – ${url}`;
      })
      .filter(Boolean) as string[];
  } else {
    lines = splitLines(text);
  }

  const allMovies = await prisma.movie.findMany({
    where: { approved: true },
    select: { id: true, title: true, originalTitle: true, year: true, contentType: true, watchUrl: true }
  });
  const index = buildTitleIndex(allMovies);

  const results: { line: string; status: string; detail?: string }[] = [];
  const changes: LoggedChange[] = [];

  for (const line of lines) {
    const extracted = extractTrailingUrl(line);
    if (!extracted) {
      results.push({ line, status: 'CHYBA', detail: 'Řádek neodpovídá formátu "Název – URL" (zkontroluj, zda řádek obsahuje platnou http(s) adresu)' });
      continue;
    }
    const { rest: titlePart, url } = extracted;

    // Rozpoznanie vzoru "S01E01" na konci názvu — určuje, že ide o epizódu.
    const episodeMatch = titlePart.match(/^(.+?)\s+S(\d{1,2})E(\d{1,3})\s*$/i);

    let rawTitleFull: string;
    let seasonNumber: number | null = null;
    let episodeNumber: number | null = null;
    if (episodeMatch) {
      rawTitleFull = episodeMatch[1].trim();
      seasonNumber = parseInt(episodeMatch[2], 10);
      episodeNumber = parseInt(episodeMatch[3], 10);
    } else {
      rawTitleFull = titlePart.trim();
    }

    const { candidates: rawCandidates, title, suggestion } = findCandidates(index, rawTitleFull);

    // Ak je viac kandidátov len preto, že máme film AJ seriál s rovnakým
    // názvom, vieme to rozlíšiť podľa toho, či riadok používa "S01E01"
    // (seriál) alebo nie (film) — bez toho, aby bolo treba dopĺňať rok.
    let candidates = rawCandidates;
    if (candidates.length > 1) {
      const wantedType = seasonNumber !== null ? 'Seriál' : 'Film';
      const narrowed = candidates.filter((c) => c.contentType === wantedType);
      if (narrowed.length === 1) candidates = narrowed;
    }

    if (candidates.length === 0) {
      results.push({
        line,
        status: 'NENÁJDENÉ',
        detail: suggestion ? `Žádný přesný film/seriál s názvem "${title}" — vo filmotéke je podobný "${suggestion}"` : `Žádný film/seriál s názvem "${title}"`
      });
      continue;
    }
    if (candidates.length > 1) {
      const years = candidates.map((c) => c.year || '?').join(', ');
      results.push({ line, status: 'NEJEDNOZNAČNÉ', detail: `Více záznamů s názvem "${title}" (roky: ${years}) — přidej rok do závorky` });
      continue;
    }

    const movie = candidates[0];

    if (seasonNumber === null) {
      // Odkaz na film — priamo na Movie.watchUrl.
      if (movie.contentType === 'Seriál') {
        results.push({
          line,
          status: 'CHYBA',
          detail: `"${movie.title}" je seriál — u seriálů je potřeba uvést i sérii a díl, např. "${title} S01E01"`
        });
        continue;
      }
      results.push({ line, status: movie.watchUrl === url ? 'BEZ ZMENY' : 'OK', detail: `${movie.title} — odkaz na film přiřazen` });
      if (!preview && movie.watchUrl !== url) {
        await prisma.movie.update({ where: { id: movie.id }, data: { watchUrl: url } });
        changes.push({ targetType: 'movie', targetId: movie.id, movieTitle: movie.title, field: 'watchUrl', oldValue: movie.watchUrl, newValue: url });
      }
      continue;
    }

    if (episodeNumber === null) {
      results.push({ line, status: 'CHYBA', detail: 'Chybí číslo epizody ve vzoru "S01E01"' });
      continue;
    }
    const season = await prisma.season.findFirst({ where: { movieId: movie.id, number: seasonNumber } });
    if (!season) {
      results.push({ line, status: 'NENÁJDENÉ', detail: `"${movie.title}" nemá sériu ${seasonNumber} vo filmotéke` });
      continue;
    }
    const episode = await prisma.episode.findFirst({ where: { seasonId: season.id, number: episodeNumber } });
    if (!episode) {
      results.push({
        line,
        status: 'NENÁJDENÉ',
        detail: `"${movie.title}" S${String(seasonNumber).padStart(2, '0')} nemá diel ${episodeNumber} vo filmotéke`
      });
      continue;
    }

    const label = `${movie.title} S${String(seasonNumber).padStart(2, '0')}E${String(episodeNumber).padStart(2, '0')}`;
    results.push({ line, status: episode.onlineUrl === url ? 'BEZ ZMENY' : 'OK', detail: `${label} — odkaz přiřazen` });
    if (!preview && episode.onlineUrl !== url) {
      await prisma.episode.update({ where: { id: episode.id }, data: { onlineUrl: url } });
      changes.push({ targetType: 'episode', targetId: episode.id, movieTitle: label, field: 'onlineUrl', oldValue: episode.onlineUrl, newValue: url });
    }
  }

  if (preview) {
    return NextResponse.json({ results, preview: true });
  }

  const batchId = await logBulkImportBatch('online', changes, clientBatchId);
  await logBulkAction({
    userId: (session.user as any).id,
    userName: (session.user as any).name || 'neznámy',
    toolName: 'Hromadný import online odkazů',
    updated: changes.length,
    total: results.length
  });
  return NextResponse.json({ results, batchId, changedCount: changes.length });
}
