import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// CSV polia môžu obsahovať čiarky, úvodzovky alebo nové riadky (napr. názvy
// s dvojbodkou a podtitulom) — každú hodnotu preto obalíme do úvodzoviek a
// zdvojíme prípadné úvodzovky vnútri, ako to vyžaduje formát CSV.
function csvCell(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Nemáš oprávnenie na túto akciu.' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const yearFrom = searchParams.get('yearFrom');
  const yearTo = searchParams.get('yearTo');
  const contentType = searchParams.get('contentType'); // 'Film' | 'Seriál' | 'TV film' | null (všetko)
  const approvedOnly = searchParams.get('approvedOnly') !== 'false'; // default: len schválené

  const movies = await prisma.movie.findMany({
    where: {
      ...(approvedOnly ? { approved: true } : {}),
      ...(contentType ? { contentType } : {})
    },
    orderBy: [{ year: 'asc' }, { title: 'asc' }],
    select: { title: true, originalTitle: true, year: true, contentType: true }
  });

  // Rok je textové pole (napr. "2011–2019" pri seriáloch), preto pri filtri
  // podľa rozsahu porovnávame len prvé 4 číslice (počiatočný rok).
  const filtered = movies.filter((m) => {
    if (!yearFrom && !yearTo) return true;
    const startYear = parseInt((m.year || '').slice(0, 4), 10);
    if (Number.isNaN(startYear)) return false;
    if (yearFrom && startYear < parseInt(yearFrom, 10)) return false;
    if (yearTo && startYear > parseInt(yearTo, 10)) return false;
    return true;
  });

  const header = ['Nazov', 'Povodny nazov', 'Rok', 'Typ'].map(csvCell).join(',');
  const rows = filtered.map((m) =>
    [m.title, m.originalTitle || '', m.year || '', m.contentType].map((v) => csvCell(v)).join(',')
  );
  // \uFEFF (BOM) na začiatku, nech Excel na Windows správne rozpozná
  // kódovanie UTF-8 a nezobrazí namiesto diakritiky rozbité znaky.
  const csv = '\uFEFF' + [header, ...rows].join('\r\n');

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="filmy-a-serialy-${new Date().toISOString().slice(0, 10)}.csv"`
    }
  });
}
