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
  // Prvý distribútor sa priradí k domácej premiére (ČR, potom SR), ďalší
  // k nasledujúcej krajine v poradí podľa dátumu premiéry (spravidla pôvodná).
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  const allMovies = await prisma.movie.findMany({
    where: { approved: true },
    select: { id: true, title: true, originalTitle: true, year: true }
  });
  const byNormalizedTitle = new Map<string, { id: string; title: string; year: string | null }[]>();
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
    const match = line.match(/^(.+?)\s*[–-]\s*(.+)$/);
    if (!match) {
      results.push({ line, status: 'CHYBA', detail: 'Riadok nezodpovedá formátu "Názov – distribútori"' });
      continue;
    }
    const [, rawTitleFull, rawDistributors] = match;

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
