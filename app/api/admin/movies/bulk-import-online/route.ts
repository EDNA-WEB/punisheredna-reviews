import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logBulkImportBatch, LoggedChange } from '@/lib/bulkImportLog';

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

  const { text, preview } = await req.json();
  if (typeof text !== 'string' || !text.trim()) {
    return NextResponse.json({ error: 'Chýba text na spracovanie.' }, { status: 400 });
  }

  // Dva podporované formáty riadku:
  //   "Together – https://..."                  → odkaz na film
  //   "Hra o trůny S01E01 – https://...         → odkaz na konkrétnu epizódu
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  const allMovies = await prisma.movie.findMany({
    where: { approved: true },
    select: { id: true, title: true, originalTitle: true, year: true, contentType: true, watchUrl: true }
  });
  const byNormalizedTitle = new Map<string, (typeof allMovies)[number][]>();
  for (const m of allMovies) {
    for (const t of [m.title, m.originalTitle].filter(Boolean) as string[]) {
      const key = normalize(t);
      if (!byNormalizedTitle.has(key)) byNormalizedTitle.set(key, []);
      byNormalizedTitle.get(key)!.push(m);
    }
  }

  const results: { line: string; status: string; detail?: string }[] = [];
  const changes: LoggedChange[] = [];

  for (const line of lines) {
    const match = line.match(/^(.+?)\s*[–-]\s*(https?:\/\/\S+)$/);
    if (!match) {
      results.push({ line, status: 'CHYBA', detail: 'Riadok nezodpovedá formátu "Názov – URL"' });
      continue;
    }
    const [, titlePart, url] = match;

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

    const yearMatch = rawTitleFull.match(/^(.+?)\s*\((\d{4})\)\s*$/);
    const rawTitle = yearMatch ? yearMatch[1].trim() : rawTitleFull;
    const explicitYear = yearMatch ? yearMatch[2] : null;

    let candidates = byNormalizedTitle.get(normalize(rawTitle)) || [];
    if (explicitYear) candidates = candidates.filter((c) => (c.year || '').startsWith(explicitYear));

    if (candidates.length === 0) {
      results.push({ line, status: 'NENÁJDENÉ', detail: `Žiadny film/seriál s názvom "${rawTitle}"` });
      continue;
    }
    if (candidates.length > 1) {
      const years = candidates.map((c) => c.year || '?').join(', ');
      results.push({
        line,
        status: 'NEJEDNOZNAČNÉ',
        detail: `Viac záznamov s názvom "${rawTitle}" (roky: ${years}) — pridaj rok do zátvorky`
      });
      continue;
    }

    const movie = candidates[0];

    if (seasonNumber === null) {
      // Odkaz na film — priamo na Movie.watchUrl.
      if (movie.contentType === 'Seriál') {
        results.push({
          line,
          status: 'CHYBA',
          detail: `"${movie.title}" je seriál — pri seriáloch treba uviesť aj sériu a diel, napr. "${rawTitle} S01E01"`
        });
        continue;
      }
      results.push({ line, status: movie.watchUrl === url ? 'BEZ ZMENY' : 'OK', detail: `${movie.title} — odkaz na film priradený` });
      if (!preview && movie.watchUrl !== url) {
        await prisma.movie.update({ where: { id: movie.id }, data: { watchUrl: url } });
        changes.push({ targetType: 'movie', targetId: movie.id, movieTitle: movie.title, field: 'watchUrl', oldValue: movie.watchUrl, newValue: url });
      }
      continue;
    }

    // Odkaz na konkrétnu epizódu.
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
    results.push({ line, status: episode.onlineUrl === url ? 'BEZ ZMENY' : 'OK', detail: `${label} — odkaz priradený` });
    if (!preview && episode.onlineUrl !== url) {
      await prisma.episode.update({ where: { id: episode.id }, data: { onlineUrl: url } });
      changes.push({ targetType: 'episode', targetId: episode.id, movieTitle: label, field: 'onlineUrl', oldValue: episode.onlineUrl, newValue: url });
    }
  }

  if (preview) {
    return NextResponse.json({ results, preview: true });
  }

  const batchId = await logBulkImportBatch('online', changes);
  return NextResponse.json({ results, batchId, changedCount: changes.length });
}
