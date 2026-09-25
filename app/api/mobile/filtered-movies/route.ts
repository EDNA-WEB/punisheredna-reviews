import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// Zjednodušená appková verzia filtra z webu (AdvancedFilterForm) — len tie
// najpoužívanejšie polia (typ obsahu, žánre, roky), nie kompletný zoznam so
// štábom/hodnotením atď. Berie parametre cez URL (?types=Film,Seriál&genres=...).
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const types = searchParams.get('types')?.split(',').filter(Boolean) || [];
    const genres = searchParams.get('genres')?.split(',').filter(Boolean) || [];
    const countries = searchParams.get('countries')?.split(',').filter(Boolean) || [];
    const tags = searchParams.get('tags')?.split(',').filter(Boolean) || [];
    const yearFrom = searchParams.get('yearFrom');
    const yearTo = searchParams.get('yearTo');

    const where: any = { approved: true };
    if (types.length > 0) where.contentType = { in: types };
    const andConditions: any[] = [];
    genres.forEach((g) => andConditions.push({ genres: { contains: g } }));
    countries.forEach((c) => andConditions.push({ countries: { contains: c } }));
    tags.forEach((t) => andConditions.push({ tags: { contains: t } }));
    if (andConditions.length > 0) where.AND = andConditions;
    if (yearFrom || yearTo) {
      where.year = {};
      if (yearFrom) where.year.gte = yearFrom;
      if (yearTo) where.year.lte = yearTo;
    }

    const movies = await prisma.movie.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 40,
      select: { id: true, title: true, slug: true, poster: true, year: true, genres: true }
    });

    return NextResponse.json(movies, { status: 200 });
  } catch (error) {
    console.error('[api/mobile/filtered-movies]', error);
    return NextResponse.json({ error: 'Chyba pri filtrovaní filmov.' }, { status: 500 });
  }
}
