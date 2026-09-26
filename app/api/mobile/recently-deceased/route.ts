import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 20;

// Rovnaká logika ako na webe — len osoby s vyplneným úmrtím a fotkou,
// zoradené od najnovšieho úmrtia.
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(0, parseInt(searchParams.get('page') || '0', 10) || 0);

    const [people, total] = await Promise.all([
      prisma.person.findMany({
        where: { approved: true, deathDate: { not: null }, photo: { not: null } },
        orderBy: { deathDate: 'desc' },
        skip: page * PAGE_SIZE,
        take: PAGE_SIZE,
        select: { id: true, name: true, slug: true, photo: true, birthDate: true, deathDate: true, birthPlace: true, deathPlace: true }
      }),
      prisma.person.count({ where: { approved: true, deathDate: { not: null }, photo: { not: null } } })
    ]);

    return NextResponse.json({ people, totalPages: Math.ceil(total / PAGE_SIZE) }, { status: 200 });
  } catch (error) {
    console.error('[api/mobile/recently-deceased]', error);
    return NextResponse.json({ error: 'Chyba pri načítaní.' }, { status: 500 });
  }
}
