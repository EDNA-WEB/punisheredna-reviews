import { NextResponse } from 'next/server';
import { cdnHeaders } from '@/lib/memoCache';
import { prisma } from '@/lib/prisma';
import { getMoviePercents } from '@/lib/moviePercents';

export const dynamic = 'force-dynamic';

// Filtre vyhľadávania v appke: typ, žánre, krajiny, tagy, roky, minimálne
// hodnotenie (%) a voliteľne aj text (názov / originálny názov), takže
// filtre a vyhľadávacie pole fungujú spolu. Parametre cez URL
// (?q=vetrelec&types=Film,Seriál&genres=...&minRating=70).
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get('q') || '').trim().slice(0, 80);
    const types = searchParams.get('types')?.split(',').filter(Boolean) || [];
    const genres = searchParams.get('genres')?.split(',').filter(Boolean) || [];
    const countries = searchParams.get('countries')?.split(',').filter(Boolean) || [];
    const tags = searchParams.get('tags')?.split(',').filter(Boolean) || [];
    const yearFrom = searchParams.get('yearFrom');
    const yearTo = searchParams.get('yearTo');
    const minRating = Math.min(100, Math.max(0, Number(searchParams.get('minRating')) || 0));

    const where: any = { approved: true };
    if (types.length > 0) where.contentType = { in: types };
    const andConditions: any[] = [];
    if (q.length >= 2) {
      andConditions.push({ OR: [{ title: { contains: q, mode: 'insensitive' } }, { originalTitle: { contains: q, mode: 'insensitive' } }] });
    }
    genres.forEach((g) => andConditions.push({ genres: { contains: g, mode: 'insensitive' } }));
    countries.forEach((c) => andConditions.push({ countries: { contains: c, mode: 'insensitive' } }));
    tags.forEach((t) => andConditions.push({ tags: { contains: t, mode: 'insensitive' } }));
    if (andConditions.length > 0) where.AND = andConditions;
    if (yearFrom || yearTo) {
      where.year = {};
      if (yearFrom) where.year.gte = yearFrom;
      if (yearTo) where.year.lte = yearTo;
    }

    // Pri filtri hodnotenia treba viac kandidátov, lebo časť sa vyradí až po výpočte percenta.
    const movies = await prisma.movie.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: minRating > 0 ? 150 : 40,
      select: { id: true, title: true, slug: true, poster: true, year: true, genres: true, countries: true, contentType: true }
    });

    const percents = await getMoviePercents(movies.map((m) => m.id));
    let result = movies.map((m) => ({ ...m, percent: percents[m.id]?.percent ?? null, percentColor: percents[m.id]?.percentColor ?? null }));
    if (minRating > 0) {
      result = result.filter((m) => m.percent !== null && m.percent >= minRating).sort((a, b) => (b.percent || 0) - (a.percent || 0));
    }

    return NextResponse.json(result.slice(0, 40), { status: 200, headers: cdnHeaders(60) });
  } catch (error) {
    console.error('[api/mobile/filtered-movies]', error);
    return NextResponse.json({ error: 'Chyba pri filtrovaní filmov.' }, { status: 500 });
  }
}
