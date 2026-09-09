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

  // Očakávaný formát riadku: "Názov filmu – Platforma – https://..."
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  const allMovies = await prisma.movie.findMany({
    where: { approved: true },
    select: { id: true, title: true, originalTitle: true, year: true, streamingServices: { include: { streamingService: true } } }
  });
  const byNormalizedTitle = new Map<string, (typeof allMovies)[number][]>();
  for (const m of allMovies) {
    for (const t of [m.title, m.originalTitle].filter(Boolean) as string[]) {
      const key = normalize(t);
      if (!byNormalizedTitle.has(key)) byNormalizedTitle.set(key, []);
      byNormalizedTitle.get(key)!.push(m);
    }
  }

  const allServices = await prisma.streamingService.findMany();
  const serviceByName = new Map(allServices.map((s) => [normalize(s.name), s]));

  const results: { line: string; status: string; detail?: string; oldValue?: string | null; newValue?: string }[] = [];
  const changes: LoggedChange[] = [];

  for (const line of lines) {
    // Tri časti oddelené pomlčkou: Názov filmu – Platforma – URL
    const match = line.match(/^(.+?)\s*[–-]\s*(.+?)\s*[–-]\s*(https?:\/\/\S+)$/);
    if (!match) {
      results.push({ line, status: 'CHYBA', detail: 'Riadok nezodpovedá formátu "Názov – Platforma – URL"' });
      continue;
    }
    const [, rawTitleFull, rawService, url] = match;

    const yearMatch = rawTitleFull.match(/^(.+?)\s*\((\d{4})\)\s*$/);
    const rawTitle = yearMatch ? yearMatch[1].trim() : rawTitleFull.trim();
    const explicitYear = yearMatch ? yearMatch[2] : null;

    let candidates = byNormalizedTitle.get(normalize(rawTitle)) || [];
    if (explicitYear) candidates = candidates.filter((c) => (c.year || '').startsWith(explicitYear));

    if (candidates.length === 0) {
      results.push({ line, status: 'NENÁJDENÉ', detail: `Žiadny film s názvom "${rawTitle}"` });
      continue;
    }
    if (candidates.length > 1) {
      const years = candidates.map((c) => c.year || '?').join(', ');
      results.push({
        line,
        status: 'NEJEDNOZNAČNÉ',
        detail: `Viac filmov s názvom "${rawTitle}" (roky: ${years}) — pridaj rok do zátvorky`
      });
      continue;
    }

    const movie = candidates[0];

    // Platformu nájdeme podľa existujúceho zoznamu služieb — ak nejestvuje,
    // vytvoríme novú (rovnaký princíp ako pri type odkazu "ČSFD").
    let service = serviceByName.get(normalize(rawService));
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
        serviceByName.set(normalize(service.name), service);
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
