import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { computeBoxOffice } from '@/lib/boxOffice';
import { adjustForInflation } from '@/lib/inflation';
import { getSessionOrMobile } from '@/lib/adminAuth';
import { isActiveMember } from '@/lib/membership';

async function loadMovieStats(id: string) {
  const m = await prisma.movie.findFirst({
    where: { id, approved: true },
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
  // Box Office je len pre Golden Ticket členov (rovnako ako stránka /box-office).
  const session = await getSessionOrMobile();
  const userId = (session?.user as any)?.id as string | undefined;
  const isAdmin = (session?.user as any)?.role === 'ADMIN';
  if (!userId) return NextResponse.json({ error: 'Musíš být přihlášený.' }, { status: 401 });
  if (!isAdmin && !(await isActiveMember(userId))) {
    return NextResponse.json({ error: 'Box Office je dostupný jen pro Golden Ticket členy.' }, { status: 403 });
  }
  const { searchParams } = new URL(req.url);
  const a = searchParams.get('a');
  const b = searchParams.get('b');
  if (!a || !b) return NextResponse.json({ error: 'Chybí jeden nebo oba filmy.' }, { status: 400 });

  const [dataA, dataB] = await Promise.all([loadMovieStats(a), loadMovieStats(b)]);
  if (!dataA || !dataB) return NextResponse.json({ error: 'Film se nenašel.' }, { status: 404 });

  return NextResponse.json({ a: dataA, b: dataB });
}
