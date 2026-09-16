import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { computeBoxOffice } from '@/lib/boxOffice';

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Nemáš oprávnenie na túto akciu.' }, { status: 403 });
  }

  // Jeden dopyt na CELÚ filmotéku, jeden prepočet, jeden zápis na konci —
  // toto je presne to, čo sa predtým robilo (oveľa drahšie) pri KAŽDOM
  // zobrazení profilu filmu. Tlačidlo sa má stláčať príležitostne (napr. po
  // väčšej aktualizácii rozpočtov/tržieb), nie automaticky pri návšteve.
  const allWithBudget = await prisma.movie.findMany({
    where: { approved: true, budget: { not: null } },
    select: {
      id: true, budget: true, marketingBudget: true, boxOffice: true,
      domesticBoxOffice: true, internationalBoxOffice: true, chinaBoxOffice: true, ancillaryRevenue: true
    }
  });

  const withProfit = allWithBudget
    .map((m) => {
      const stats = computeBoxOffice(
        Number(m.budget),
        m.marketingBudget !== null ? Number(m.marketingBudget) : null,
        m.boxOffice !== null ? Number(m.boxOffice) : null,
        m.domesticBoxOffice !== null ? Number(m.domesticBoxOffice) : null,
        m.internationalBoxOffice !== null ? Number(m.internationalBoxOffice) : null,
        m.chinaBoxOffice !== null ? Number(m.chinaBoxOffice) : null,
        m.ancillaryRevenue !== null ? Number(m.ancillaryRevenue) : null
      );
      return { id: m.id, profit: stats?.profit ?? null };
    })
    .filter((m) => m.profit !== null) as { id: string; profit: number }[];

  const total = withProfit.length;
  const sortedDesc = [...withProfit].sort((a, b) => b.profit - a.profit);

  const updates: { id: string; rank: number | null; rankType: string | null }[] = sortedDesc.map((m, index) => {
    const rankFromTop = index + 1;
    const rankFromBottom = total - index;
    if (rankFromTop <= 10 && rankFromTop <= rankFromBottom) {
      return { id: m.id, rank: rankFromTop, rankType: 'profit' };
    }
    if (rankFromBottom <= 10) {
      return { id: m.id, rank: rankFromBottom, rankType: 'flop' };
    }
    return { id: m.id, rank: null, rankType: null };
  });

  // Najprv vynulujeme všetky predošlé hodnoty (napr. film, čo bol v minulosti
  // top 10, ale už nie je, musí o svoje označenie prísť), potom zapíšeme nové.
  await prisma.movie.updateMany({
    where: { boxOfficeRank: { not: null } },
    data: { boxOfficeRank: null, boxOfficeRankType: null }
  });

  for (const u of updates) {
    if (u.rank === null) continue;
    await prisma.movie.update({ where: { id: u.id }, data: { boxOfficeRank: u.rank, boxOfficeRankType: u.rankType } });
  }

  await prisma.settings.update({ where: { id: 'singleton' }, data: { boxOfficeRankedTotal: total } });

  return NextResponse.json({ ok: true, total, ranked: updates.filter((u) => u.rank !== null).length });
}
