import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

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

  const { text } = await req.json();
  if (typeof text !== 'string' || !text.trim()) {
    return NextResponse.json({ error: 'Chýba text na spracovanie.' }, { status: 400 });
  }

  // Očakávaný formát riadku: "Názov filmu – tag1, tag2, tag3"
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  const allMovies = await prisma.movie.findMany({
    where: { approved: true },
    select: { id: true, title: true, originalTitle: true, tags: true }
  });
  const byNormalizedTitle = new Map<string, { id: string; title: string; tags: string | null }[]>();
  for (const m of allMovies) {
    for (const t of [m.title, m.originalTitle].filter(Boolean) as string[]) {
      const key = normalize(t);
      if (!byNormalizedTitle.has(key)) byNormalizedTitle.set(key, []);
      byNormalizedTitle.get(key)!.push(m);
    }
  }

  const results: { line: string; status: string; detail?: string }[] = [];

  for (const line of lines) {
    const match = line.match(/^(.+?)\s*[–-]\s*(.+)$/);
    if (!match) {
      results.push({ line, status: 'CHYBA', detail: 'Riadok nezodpovedá formátu "Názov – tagy"' });
      continue;
    }
    const [, rawTitle, rawTags] = match;
    const candidates = byNormalizedTitle.get(normalize(rawTitle));

    if (!candidates || candidates.length === 0) {
      results.push({ line, status: 'NENÁJDENÉ', detail: `Žiadny film s názvom "${rawTitle}"` });
      continue;
    }
    if (candidates.length > 1) {
      results.push({ line, status: 'NEJEDNOZNAČNÉ', detail: `Viac filmov s názvom "${rawTitle}" — preskočené` });
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

    await prisma.movie.update({ where: { id: movie.id }, data: { tags: merged.join(', ') } });
    results.push({ line, status: 'OK', detail: `${movie.title}: ${merged.join(', ')}` });
  }

  return NextResponse.json({ results });
}
