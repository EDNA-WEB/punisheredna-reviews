import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { computeBoxOffice } from '@/lib/boxOffice';
import { adjustForInflation } from '@/lib/inflation';

async function loadMovieStats(id: string) {
  const m = await prisma.movie.findUnique({
    where: { id },
    select: {
      id: true, title: true, slug: true, poster: true, year: true, budget: true, marketingBudget: true, boxOffice: true,
      domesticBoxOffice: true, internationalBoxOffice: true, chinaBoxOffice: true, ancillaryRevenue: true
    }
  });
  if (!m) return null;

  const budgetN = m.budget !== null ? Number(m.budget) : null;
  const marketingN = m.marketingBudget !== null ? Number(m.marketingBudget) : null;
  const boxOfficeN = m.boxOffice !== null ? Number(m.boxOffice) : null;
  const domesticN = m.domesticBoxOffice !== null ? Number(m.domesticBoxOffice) : null;
  const internationalN = m.internationalBoxOffice !== null ? Number(m.internationalBoxOffice) : null;
  const chinaN = m.chinaBoxOffice !== null ? Number(m.chinaBoxOffice) : null;
  const ancillaryN = m.ancillaryRevenue !== null ? Number(m.ancillaryRevenue) : null;

  const stats = computeBoxOffice(budgetN, marketingN, boxOfficeN, domesticN, internationalN, chinaN, ancillaryN);
  const releaseYear = Number(m.year) || new Date().getFullYear();

  const adjusted = stats
    ? {
        earned: adjustForInflation(stats.earned, releaseYear),
        totalCost: adjustForInflation(stats.totalCost, releaseYear),
        studioTheatricalRevenue: adjustForInflation(stats.studioTheatricalRevenue, releaseYear),
        ancillaryRevenue: adjustForInflation(stats.ancillaryRevenue, releaseYear),
        totalStudioRevenue: adjustForInflation(stats.totalStudioRevenue, releaseYear),
        profit: adjustForInflation(stats.profit, releaseYear)
      }
    : null;

  const profitRatio = stats && stats.totalCost > 0 ? stats.profit / stats.totalCost : null;

  return { movie: m, releaseYear, stats, adjusted, profitRatio };
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const a = searchParams.get('a');
  const b = searchParams.get('b');
  if (!a || !b) return NextResponse.json({ error: 'Chýba jeden alebo oba filmy.' }, { status: 400 });

  const [dataA, dataB] = await Promise.all([loadMovieStats(a), loadMovieStats(b)]);
  if (!dataA || !dataB) return NextResponse.json({ error: 'Film sa nenašiel.' }, { status: 404 });

  return NextResponse.json({ a: dataA, b: dataB });
}
