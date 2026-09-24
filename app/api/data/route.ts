import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Verejný, jednoduchý zoznam filmov pre mobilnú aplikáciu — len schválené
// tituly, najnovšie pridané prvé. Vracia presne tie polia, čo v databáze
// naozaj existujú (title, poster, synopsis, year, genres...), nie vymyslené
// názvy ako predtým.
export async function GET() {
  try {
    const movies = await prisma.movie.findMany({
      where: { approved: true },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true,
        title: true,
        slug: true,
        poster: true,
        synopsis: true,
        year: true,
        genres: true,
        trailerUrl: true
      }
    });

    return NextResponse.json(movies, { status: 200 });
  } catch (error) {
    console.error('[api/data] Chyba pri načítaní filmov:', error);
    return NextResponse.json({ error: 'Chyba pri načítaní dát z databázy.' }, { status: 500 });
  }
}
